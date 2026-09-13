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
    try:
        hello_data = await websocket.receive_json()
        version = hello_data.get("version")
        if version != PROTOCOL_VERSION:
            err = ErrorMessage(
                room_id=room_id,
                code="VERSION_MISMATCH",
                message=f"Expected protocol {PROTOCOL_VERSION}, got {version}",
                timestamp=time.time(),
            ).model_dump(mode="json")
            await websocket.send_json(err)
            await websocket.close(code=1002)
            return

        msg_type = hello_data.get("type")
        if msg_type != MessageType.HELLO.value:
            err = ErrorMessage(
                room_id=room_id,
                code="UNEXPECTED_MESSAGE",
                message="First message must be HELLO",
                timestamp=time.time(),
            ).model_dump(mode="json")
            await websocket.send_json(err)
            await websocket.close(code=1002)
            return

        role_str = hello_data.get("role")
        if role_str == "operator":
            current_role = Role.OPERATOR
        elif role_str == "node":
            current_role = Role.NODE
        else:
            err = ErrorMessage(
                room_id=room_id,
                code="INVALID_ROLE",
                message="Role must be operator or node",
                timestamp=time.time(),
            ).model_dump(mode="json")
            await websocket.send_json(err)
            await websocket.close(code=1003)
            return

        room = await room_manager.register_connection(room_id, current_role, websocket)

        while True:
            data = await websocket.receive_json()
            m_type = data.get("type")

            if m_type == MessageType.MITIGATION_COMMAND.value:
                await room.send_to_node(data)
            elif m_type == MessageType.COMMAND_ACK.value:
                await room.send_to_operator(data)
            elif m_type in (
                MessageType.NODE_READY.value,
                MessageType.START_PROFILE.value,
                MessageType.INJECT_INSTABILITY.value,
                MessageType.SAFE_HOLD.value,
            ):
                await room.send_to_operator(data)
            else:
                await room.broadcast(data, exclude=websocket)

    except WebSocketDisconnect:
        await room_manager.remove_connection(room_id, websocket)
    except Exception:
        await room_manager.remove_connection(room_id, websocket)