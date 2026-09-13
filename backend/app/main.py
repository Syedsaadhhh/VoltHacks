import hashlib
import json
import time
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, model_validator
from .config import CORS_ORIGINS, PROTOCOL_VERSION
from .protocol import (
    ErrorMessage,
    MessageType,
    Role,
    ProtocolFatalError,
    ProtocolCommandError,
    validate_inbound_message,
)
from .rooms import room_manager
from .proof_store import proof_store

app = FastAPI(
    title="CutHush API",
    description="Browser hardware-in-the-loop acoustic governor",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials="*" not in CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CreateRoomResponse(BaseModel):
    room_id: str
    created_at: float

class HealthResponse(BaseModel):
    status: str
    version: str
    protocol_version: str
    active_rooms: int
    timestamp: float

class ProofCreateRequest(BaseModel):
    run_id: str = Field(..., min_length=3, max_length=100)
    room_id: str = Field(..., min_length=1, max_length=100)
    created_at: str = Field(..., min_length=10, max_length=64)
    source: str = Field(..., pattern="^(REPLAY_FIXTURE|LIVE_MIC)$")
    seed: int
    outcome: str = Field(..., pattern="^(RECOVERED|UNRESOLVED)$")
    off_exposure_ms: int = Field(..., ge=0)
    on_exposure_ms: int = Field(..., ge=0)
    reduction_db: Optional[float] = None
    digest: str = Field(..., pattern="^[a-f0-9]{64}$")
    previous_digest: Optional[str] = Field(default=None, pattern="^[a-f0-9]{64}$")

    @model_validator(mode="after")
    def verify_digest(self):
        unsigned = self.model_dump(mode="json", exclude={"digest"})
        canonical = json.dumps(unsigned, separators=(",", ":"), sort_keys=True)
        expected = hashlib.sha256(canonical.encode()).hexdigest()
        if self.digest != expected:
            raise ValueError("digest does not match the canonical proof payload")
        return self

@app.get("/api/health", response_model=HealthResponse)
async def get_health():
    return HealthResponse(
        status="ok",
        version="0.3.0",
        protocol_version=PROTOCOL_VERSION,
        active_rooms=len(room_manager.rooms),
        timestamp=time.time(),
    )

@app.post("/api/rooms", response_model=CreateRoomResponse)
async def create_room():
    room_id = room_manager.create_room()
    return CreateRoomResponse(room_id=room_id, created_at=time.time())

@app.get("/api/rooms/{room_id}")
async def get_room(room_id: str):
    room = room_manager.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {
        "room_id": room.room_id,
        "is_paired": room.is_paired,
        "peers": room.get_peers(),
        "created_at": room.created_at,
    }

@app.post("/api/proofs", status_code=201)
async def create_proof(proof: ProofCreateRequest):
    return proof_store.save(proof.model_dump(mode="json"))

@app.get("/api/proofs/{run_id}")
async def get_proof(run_id: str):
    proof = proof_store.get(run_id)
    if proof is None:
        raise HTTPException(status_code=404, detail="Proof not found")
    return proof

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()
    current_role: Optional[Role] = None
    registered = False
    try:
        # First message must be HELLO
        hello_data = await websocket.receive_json()
        try:
            validated_hello = validate_inbound_message(hello_data, room_id, current_role=None)
        except ProtocolFatalError as pfe:
            err = ErrorMessage(
                room_id=room_id,
                code=pfe.code,
                message=pfe.message,
                timestamp=time.time(),
            ).model_dump(mode="json")
            await websocket.send_json(err)
            await websocket.close(code=pfe.ws_close_code)
            return

        current_role = validated_hello.role
        room = await room_manager.register_connection(room_id, current_role, websocket)
        registered = True

        while True:
            data = await websocket.receive_json()
            try:
                msg = validate_inbound_message(data, room_id, current_role=current_role)
            except ProtocolFatalError as pfe:
                err = ErrorMessage(
                    room_id=room_id,
                    code=pfe.code,
                    message=pfe.message,
                    timestamp=time.time(),
                ).model_dump(mode="json")
                await websocket.send_json(err)
                await websocket.close(code=pfe.ws_close_code)
                break
            except ProtocolCommandError as pce:
                err = ErrorMessage(
                    room_id=room_id,
                    code=pce.code,
                    message=pce.message,
                    timestamp=time.time(),
                ).model_dump(mode="json")
                await websocket.send_json(err)
                # Non-fatal command error: leave connection open and do not forward
                continue

            payload = msg.model_dump(mode="json")
            if msg.type == MessageType.MITIGATION_COMMAND:
                accepted, rejection_code = room.accept_command(msg.command_id, msg.timestamp)
                if not accepted:
                    await room.send_to_operator(ErrorMessage(
                        room_id=room_id,
                        code=rejection_code,
                        message="Command was stale or already processed; actuator was not invoked",
                        timestamp=time.time(),
                    ).model_dump(mode="json"))
                    continue
                await room.send_to_node(payload)
            elif msg.type == MessageType.COMMAND_ACK:
                await room.send_to_operator(payload)
            elif msg.type in (
                MessageType.NODE_READY,
                MessageType.START_PROFILE,
                MessageType.INJECT_INSTABILITY,
                MessageType.SAFE_HOLD,
            ):
                await room.send_to_operator(payload)
            else:
                await room.broadcast(payload, exclude=websocket)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if registered:
            await room_manager.remove_connection(room_id, websocket)

# Production image copies the Vite build here. Mount last so API and WebSocket
# routes retain precedence.
frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if frontend_dist.is_dir():
    assets_dir = frontend_dist / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        requested = frontend_dist / full_path
        if full_path and requested.is_file() and frontend_dist in requested.resolve().parents:
            return FileResponse(requested)
        return FileResponse(frontend_dist / "index.html")
