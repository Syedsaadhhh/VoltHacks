import pytest
import time
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.protocol import PROTOCOL_VERSION
from backend.app.rooms import room_manager

def test_websocket_room_pairing_and_mitigation():
    client = TestClient(app)
    room_id = "HUSH-TEST-PAIR"

    with client.websocket_connect(f"/ws/{room_id}") as op_ws:
        op_ws.send_json({
            "version": PROTOCOL_VERSION,
            "type": "HELLO",
            "room_id": room_id,
            "client_id": "op-1",
            "role": "operator",
            "timestamp": time.time(),
        })
        op_pair_msg = op_ws.receive_json()
        assert op_pair_msg["type"] == "PAIR"
        assert op_pair_msg["paired"] is False
        assert op_pair_msg["peers"] == ["operator"]

        with client.websocket_connect(f"/ws/{room_id}") as node_ws:
            node_ws.send_json({
                "version": PROTOCOL_VERSION,
                "type": "HELLO",
                "room_id": room_id,
                "client_id": "node-1",
                "role": "node",
                "timestamp": time.time(),
            })
            node_pair_msg = node_ws.receive_json()
            assert node_pair_msg["type"] == "PAIR"
            assert node_pair_msg["paired"] is True
            assert "operator" in node_pair_msg["peers"]
            assert "node" in node_pair_msg["peers"]

            op_updated_pair = op_ws.receive_json()
            assert op_updated_pair["type"] == "PAIR"
            assert op_updated_pair["paired"] is True

            op_ws.send_json({
                "version": PROTOCOL_VERSION,
                "type": "MITIGATION_COMMAND",
                "room_id": room_id,
                "command_id": "cmd-xyz",
                "reduction_ratio": 0.6,
                "ramp_ms": 200,
                "dither_hz": 50.0,
                "reason": "MANUAL_RUN_1",
                "timestamp": time.time(),
            })

            node_received_cmd = node_ws.receive_json()
            while node_received_cmd.get("type") == "HEARTBEAT":
                node_received_cmd = node_ws.receive_json()

            assert node_received_cmd["type"] == "MITIGATION_COMMAND"
            assert node_received_cmd["command_id"] == "cmd-xyz"

            node_ws.send_json({
                "version": PROTOCOL_VERSION,
                "type": "COMMAND_ACK",
                "room_id": room_id,
                "command_id": "cmd-xyz",
                "applied": True,
                "state_after": "MITIGATING",
                "latency_ms": 8.4,
                "timestamp": time.time(),
            })

            op_received_ack = op_ws.receive_json()
            while op_received_ack.get("type") == "HEARTBEAT":
                op_received_ack = op_ws.receive_json()

            assert op_received_ack["type"] == "COMMAND_ACK"
            assert op_received_ack["command_id"] == "cmd-xyz"
            assert op_received_ack["applied"] is True

def test_operator_liveness_heartbeat_lifecycle():
    client = TestClient(app)
    room_id = "HUSH-TEST-LIVENESS"

    # 1. Node joins first alone
    with client.websocket_connect(f"/ws/{room_id}") as node_ws:
        node_ws.send_json({
            "version": PROTOCOL_VERSION,
            "type": "HELLO",
            "room_id": room_id,
            "client_id": "node-live-1",
            "role": "node",
            "timestamp": time.time(),
        })
        node_pair_1 = node_ws.receive_json()
        assert node_pair_1["type"] == "PAIR"
        assert node_pair_1["paired"] is False

        # Verify: node alone -> NO heartbeat task running!
        room = room_manager.get_room(room_id)
        assert room is not None
        assert not room.is_paired
        assert room.heartbeat_task is None

        # 2. Operator joins -> room becomes paired -> heartbeat task starts!
        with client.websocket_connect(f"/ws/{room_id}") as op_ws:
            op_ws.send_json({
                "version": PROTOCOL_VERSION,
                "type": "HELLO",
                "room_id": room_id,
                "client_id": "op-live-1",
                "role": "operator",
                "timestamp": time.time(),
            })
            op_pair = op_ws.receive_json()
            assert op_pair["type"] == "PAIR"
            assert op_pair["paired"] is True

            node_pair_2 = node_ws.receive_json()
            assert node_pair_2["type"] == "PAIR"
            assert node_pair_2["paired"] is True

            # Heartbeat task is actively running
            assert room.is_paired
            assert room.heartbeat_task is not None

            # Node and operator receive periodic heartbeat
            node_hb = node_ws.receive_json()
            assert node_hb["type"] == "HEARTBEAT"
            op_hb = op_ws.receive_json()
            assert op_hb["type"] == "HEARTBEAT"

        # 3. Operator closed. Node receives PAIR unpair message.
        unpair_msg = node_ws.receive_json()
        while unpair_msg.get("type") == "HEARTBEAT":
            unpair_msg = node_ws.receive_json()

        assert unpair_msg["type"] == "PAIR"
        assert unpair_msg["paired"] is False

        # Heartbeat task MUST be stopped immediately
        assert not room.is_paired
        assert room.heartbeat_task is None

        # Node connection is still alive and can communicate
        node_ws.send_json({
            "version": PROTOCOL_VERSION,
            "type": "NODE_READY",
            "room_id": room_id,
            "armed": True,
            "label": "BENCH MACHINE NODE",
            "timestamp": time.time(),
        })
        assert room.heartbeat_task is None

def test_websocket_bad_version_rejected():
    client = TestClient(app)
    room_id = "HUSH-BAD-VER"

    with client.websocket_connect(f"/ws/{room_id}") as ws:
        ws.send_json({
            "version": "0.8.0",
            "type": "HELLO",
            "room_id": room_id,
            "client_id": "bad-client",
            "role": "operator",
            "timestamp": time.time(),
        })
        err = ws.receive_json()
        assert err["type"] == "ERROR"
        assert err["code"] == "VERSION_MISMATCH"

def test_websocket_wrong_room_rejected():
    client = TestClient(app)
    room_id = "HUSH-CORRECT-ROOM"

    with client.websocket_connect(f"/ws/{room_id}") as ws:
        ws.send_json({
            "version": PROTOCOL_VERSION,
            "type": "HELLO",
            "room_id": "HUSH-OTHER-ROOM",
            "client_id": "bad-client",
            "role": "operator",
            "timestamp": time.time(),
        })
        err = ws.receive_json()
        assert err["type"] == "ERROR"
        assert err["code"] == "ROOM_MISMATCH"

def test_websocket_invalid_role_command_and_bounds():
    client = TestClient(app)
    room_id = "HUSH-COMMAND-VALIDATION"

    with client.websocket_connect(f"/ws/{room_id}") as op_ws:
        op_ws.send_json({
            "version": PROTOCOL_VERSION,
            "type": "HELLO",
            "room_id": room_id,
            "client_id": "op-valid",
            "role": "operator",
            "timestamp": time.time(),
        })
        op_pair = op_ws.receive_json()
        assert op_pair["type"] == "PAIR"

        # 1. Operator attempts to send COMMAND_ACK (role violation)
        op_ws.send_json({
            "version": PROTOCOL_VERSION,
            "type": "COMMAND_ACK",
            "room_id": room_id,
            "command_id": "cmd-invalid",
            "applied": True,
            "state_after": "TEST",
            "timestamp": time.time(),
        })
        err1 = op_ws.receive_json()
        assert err1["type"] == "ERROR"
        assert err1["code"] == "ROLE_PERMISSION_DENIED"

        # 2. Operator sends out-of-bounds MITIGATION_COMMAND (reduction_ratio = 1.8 > 1.0)
        op_ws.send_json({
            "version": PROTOCOL_VERSION,
            "type": "MITIGATION_COMMAND",
            "room_id": room_id,
            "command_id": "cmd-oob",
            "reduction_ratio": 1.8,
            "ramp_ms": 250,
            "dither_hz": 40.0,
            "timestamp": time.time(),
        })
        err2 = op_ws.receive_json()
        assert err2["type"] == "ERROR"
        assert err2["code"] == "VALIDATION_ERROR"

        # 3. Connection is still open and operational: send valid mitigation command
        op_ws.send_json({
            "version": PROTOCOL_VERSION,
            "type": "MITIGATION_COMMAND",
            "room_id": room_id,
            "command_id": "cmd-valid-1",
            "reduction_ratio": 0.5,
            "ramp_ms": 250,
            "dither_hz": 40.0,
            "timestamp": time.time(),
        })
