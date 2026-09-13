import pytest
import time
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.protocol import PROTOCOL_VERSION

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