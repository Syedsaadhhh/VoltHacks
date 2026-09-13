import pytest
import time
from backend.app.protocol import (
    PROTOCOL_VERSION,
    Role,
    MessageType,
    HelloMessage,
    MitigationCommandMessage,
    CommandAckMessage,
    HeartbeatMessage,
)

def test_hello_serialization():
    msg = HelloMessage(
        room_id="HUSH-101",
        client_id="test-op",
        role=Role.OPERATOR,
        timestamp=time.time(),
    )
    d = msg.model_dump(mode="json")
    assert d["version"] == PROTOCOL_VERSION
    assert d["type"] == "HELLO"
    assert d["role"] == "operator"
    assert d["room_id"] == "HUSH-101"

def test_mitigation_and_ack():
    cmd = MitigationCommandMessage(
        room_id="HUSH-101",
        command_id="cmd-001",
        reduction_ratio=0.5,
        ramp_ms=250,
        dither_hz=40.0,
        timestamp=time.time(),
    )
    d_cmd = cmd.model_dump(mode="json")
    assert d_cmd["type"] == "MITIGATION_COMMAND"
    assert d_cmd["reduction_ratio"] == 0.5

    ack = CommandAckMessage(
        room_id="HUSH-101",
        command_id="cmd-001",
        applied=True,
        state_after="MITIGATING",
        latency_ms=12.5,
        timestamp=time.time(),
    )
    d_ack = ack.model_dump(mode="json")
    assert d_ack["type"] == "COMMAND_ACK"
    assert d_ack["applied"] is True