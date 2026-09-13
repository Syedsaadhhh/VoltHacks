import time
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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

app = FastAPI(
    title="CutHush Run 1 API",
    description="CutHush Two-Device Physical Loop Platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
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

@app.get("/api/health", response_model=HealthResponse)
async def get_health():
    return HealthResponse(
        status="ok",
        version="0.1.0",
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