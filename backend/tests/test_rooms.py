import asyncio
import time

from backend.app.protocol import CommandAckMessage, MitigationCommandMessage, Role
from backend.app.rooms import RoomManager


class FakeWebSocket:
    """Single-loop WebSocket double; avoids TestClient cross-portal deadlocks."""

    def __init__(self):
        self.messages: list[dict] = []
        self.closed = False

    async def send_json(self, payload: dict):
        self.messages.append(payload)

    async def close(self, **_kwargs):
        self.closed = True


def test_room_pairing_command_routing_and_ack():
    async def scenario():
        manager = RoomManager()
        room_id = "HUSH-TEST-PAIR"
        operator = FakeWebSocket()
        node = FakeWebSocket()

        room = await manager.register_connection(room_id, Role.OPERATOR, operator)
        assert operator.messages[-1]["type"] == "PAIR"
        assert operator.messages[-1]["paired"] is False

        await manager.register_connection(room_id, Role.NODE, node)
        assert room.is_paired
        assert operator.messages[-1]["paired"] is True
        assert node.messages[-1]["paired"] is True

        command = MitigationCommandMessage(
            room_id=room_id,
            command_id="cmd-xyz",
            reduction_ratio=0.6,
            ramp_ms=200,
            dither_hz=50,
            reason="AUTO_PERSISTENCE_4_OF_6",
            timestamp=time.time(),
        ).model_dump(mode="json")
        await room.send_to_node(command)
        assert node.messages[-1]["type"] == "MITIGATION_COMMAND"
        assert node.messages[-1]["command_id"] == "cmd-xyz"

        ack = CommandAckMessage(
            room_id=room_id,
            command_id="cmd-xyz",
            applied=True,
            state_after="MITIGATED",
            latency_ms=8.4,
            timestamp=time.time(),
        ).model_dump(mode="json")
        await room.send_to_operator(ack)
        assert operator.messages[-1]["type"] == "COMMAND_ACK"
        assert operator.messages[-1]["applied"] is True

        await manager.remove_connection(room_id, node)
        await manager.remove_connection(room_id, operator)

    asyncio.run(scenario())


def test_operator_liveness_heartbeat_lifecycle():
    async def scenario():
        manager = RoomManager()
        room_id = "HUSH-TEST-LIVENESS"
        operator = FakeWebSocket()
        node = FakeWebSocket()

        room = await manager.register_connection(room_id, Role.NODE, node)
        assert not room.is_paired
        assert room.heartbeat_task is None

        await manager.register_connection(room_id, Role.OPERATOR, operator)
        assert room.is_paired
        assert room.heartbeat_task is not None

        await asyncio.sleep(0.55)
        assert any(message["type"] == "HEARTBEAT" for message in node.messages)
        assert any(message["type"] == "HEARTBEAT" for message in operator.messages)

        await manager.remove_connection(room_id, operator)
        assert not room.is_paired
        assert room.heartbeat_task is None
        assert node.messages[-1]["type"] == "PAIR"
        assert node.messages[-1]["paired"] is False

        await manager.remove_connection(room_id, node)
        assert manager.get_room(room_id) is None

    asyncio.run(scenario())


def test_duplicate_role_replaces_and_closes_stale_socket():
    async def scenario():
        manager = RoomManager()
        first = FakeWebSocket()
        replacement = FakeWebSocket()
        await manager.register_connection("HUSH-REPLACE", Role.OPERATOR, first)
        room = await manager.register_connection("HUSH-REPLACE", Role.OPERATOR, replacement)
        assert first.closed is True
        assert room.operator_ws is replacement
        await manager.remove_connection("HUSH-REPLACE", replacement)

    asyncio.run(scenario())


def test_commands_are_fresh_and_idempotent():
    manager = RoomManager()
    room = manager.get_or_create_room("HUSH-IDEMPOTENT")
    assert room.accept_command("cmd-1", time.time()) == (True, "")
    assert room.accept_command("cmd-1", time.time()) == (False, "DUPLICATE_COMMAND")
    assert room.accept_command("cmd-old", time.time() - 10) == (False, "STALE_COMMAND")
