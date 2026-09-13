import asyncio
import secrets
import time
from typing import Dict, Optional, List
from fastapi import WebSocket
from .protocol import (
    HeartbeatMessage,
    PairMessage,
    Role,
)

class Room:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.created_at = time.time()
        self.operator_ws: Optional[WebSocket] = None
        self.node_ws: Optional[WebSocket] = None
        self.heartbeat_task: Optional[asyncio.Task] = None
        self.heartbeat_seq = 0
        self.node_armed = False

    @property
    def is_paired(self) -> bool:
        return self.operator_ws is not None and self.node_ws is not None

    def get_peers(self) -> List[str]:
        peers = []
        if self.operator_ws:
            peers.append("operator")
        if self.node_ws:
            peers.append("node")
        return peers

    async def broadcast(self, message_dict: dict, exclude: Optional[WebSocket] = None):
        recipients = []
        if self.operator_ws and self.operator_ws != exclude:
            recipients.append(self.operator_ws)
        if self.node_ws and self.node_ws != exclude:
            recipients.append(self.node_ws)
        for ws in recipients:
            try:
                await ws.send_json(message_dict)
            except Exception:
                pass

    async def send_to_operator(self, message_dict: dict):
        if self.operator_ws:
            try:
                await self.operator_ws.send_json(message_dict)
            except Exception:
                pass

    async def send_to_node(self, message_dict: dict):
        if self.node_ws:
            try:
                await self.node_ws.send_json(message_dict)
            except Exception:
                pass

    def start_heartbeat(self):
        if self.heartbeat_task is None or self.heartbeat_task.done():
            self.heartbeat_task = asyncio.create_task(self._heartbeat_loop())

    def stop_heartbeat(self):
        if self.heartbeat_task and not self.heartbeat_task.done():
            self.heartbeat_task.cancel()
            self.heartbeat_task = None

    async def _heartbeat_loop(self):
        try:
            while True:
                await asyncio.sleep(0.5)
                self.heartbeat_seq += 1
                hb = HeartbeatMessage(
                    room_id=self.room_id,
                    timestamp=time.time(),
                    seq=self.heartbeat_seq,
                    interval_ms=500
                ).model_dump(mode="json")
                if self.node_ws:
                    await self.send_to_node(hb)
                if self.operator_ws:
                    await self.send_to_operator(hb)
        except asyncio.CancelledError:
            pass

class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}

    def create_room(self) -> str:
        code = f"HUSH-{secrets.randbelow(900) + 100}"
        while code in self.rooms:
            code = f"HUSH-{secrets.randbelow(900) + 100}"
        self.rooms[code] = Room(code)
        return code

    def get_room(self, room_id: str) -> Optional[Room]:
        return self.rooms.get(room_id)

    def get_or_create_room(self, room_id: str) -> Room:
        if room_id not in self.rooms:
            self.rooms[room_id] = Room(room_id)
        return self.rooms[room_id]

    async def register_connection(self, room_id: str, role: Role, ws: WebSocket) -> Room:
        room = self.get_or_create_room(room_id)
        if role == Role.OPERATOR:
            room.operator_ws = ws
        elif role == Role.NODE:
            room.node_ws = ws
            room.start_heartbeat()

        pair_msg = PairMessage(
            room_id=room_id,
            role=role,
            paired=room.is_paired,
            peers=room.get_peers(),
            timestamp=time.time()
        ).model_dump(mode="json")
        await room.broadcast(pair_msg)
        return room

    async def remove_connection(self, room_id: str, ws: WebSocket):
        room = self.rooms.get(room_id)
        if not room:
            return
        was_node = False
        was_operator = False
        if room.operator_ws == ws:
            room.operator_ws = None
            was_operator = True
        if room.node_ws == ws:
            room.node_ws = None
            was_node = True
            room.stop_heartbeat()

        if room.operator_ws is None and room.node_ws is None:
            room.stop_heartbeat()
            self.rooms.pop(room_id, None)
        else:
            role = Role.OPERATOR if was_operator else Role.NODE
            pair_msg = PairMessage(
                room_id=room_id,
                role=role,
                paired=room.is_paired,
                peers=room.get_peers(),
                timestamp=time.time()
            ).model_dump(mode="json")
            await room.broadcast(pair_msg)

room_manager = RoomManager()