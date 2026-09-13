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
    ProtocolFatalError,
    ProtocolCommandError,
    validate_inbound_message,
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

def test_validate_inbound_bad_version():
    with pytest.raises(ProtocolFatalError) as exc_info:
        validate_inbound_message(
            {"version": "0.9.0", "type": "HELLO", "room_id": "HUSH-100", "client_id": "c1", "role": "operator", "timestamp": time.time()},
            expected_room_id="HUSH-100",
            current_role=None,
        )
    assert exc_info.value.code == "VERSION_MISMATCH"

def test_validate_inbound_wrong_room():
    with pytest.raises(ProtocolFatalError) as exc_info:
        validate_inbound_message(
            {"version": PROTOCOL_VERSION, "type": "HELLO", "room_id": "HUSH-999", "client_id": "c1", "role": "operator", "timestamp": time.time()},
            expected_room_id="HUSH-100",
            current_role=None,
        )
    assert exc_info.value.code == "ROOM_MISMATCH"

def test_validate_inbound_first_message_not_hello():
    with pytest.raises(ProtocolFatalError) as exc_info:
        validate_inbound_message(
            {"version": PROTOCOL_VERSION, "type": "MITIGATION_COMMAND", "room_id": "HUSH-100", "command_id": "c1", "timestamp": time.time()},
            expected_room_id="HUSH-100",
            current_role=None,
        )
    assert exc_info.value.code == "UNEXPECTED_MESSAGE"

def test_validate_inbound_role_permissions():
    # Operator cannot send NODE_READY or COMMAND_ACK
    with pytest.raises(ProtocolCommandError) as exc_info:
        validate_inbound_message(
            {"version": PROTOCOL_VERSION, "type": "COMMAND_ACK", "room_id": "HUSH-100", "command_id": "c1", "applied": True, "state_after": "OK", "timestamp": time.time()},
            expected_room_id="HUSH-100",
            current_role=Role.OPERATOR,
        )
    assert exc_info.value.code == "ROLE_PERMISSION_DENIED"

    # Node cannot send MITIGATION_COMMAND
    with pytest.raises(ProtocolCommandError) as exc_info:
        validate_inbound_message(
            {"version": PROTOCOL_VERSION, "type": "MITIGATION_COMMAND", "room_id": "HUSH-100", "command_id": "c1", "reduction_ratio": 0.5, "ramp_ms": 250, "dither_hz": 40.0, "timestamp": time.time()},
            expected_room_id="HUSH-100",
            current_role=Role.NODE,
        )
    assert exc_info.value.code == "ROLE_PERMISSION_DENIED"

def test_validate_inbound_out_of_bounds_mitigation():
    # reduction_ratio must be 0 < r <= 1
    with pytest.raises(ProtocolCommandError) as exc_info:
        validate_inbound_message(
            {"version": PROTOCOL_VERSION, "type": "MITIGATION_COMMAND", "room_id": "HUSH-100", "command_id": "c1", "reduction_ratio": 1.5, "ramp_ms": 250, "dither_hz": 40.0, "timestamp": time.time()},
            expected_room_id="HUSH-100",
            current_role=Role.OPERATOR,
        )
    assert exc_info.value.code == "VALIDATION_ERROR"

    # ramp_ms must be 50 <= ramp_ms <= 2000
    with pytest.raises(ProtocolCommandError) as exc_info:
        validate_inbound_message(
            {"version": PROTOCOL_VERSION, "type": "MITIGATION_COMMAND", "room_id": "HUSH-100", "command_id": "c1", "reduction_ratio": 0.5, "ramp_ms": 25, "dither_hz": 40.0, "timestamp": time.time()},
            expected_room_id="HUSH-100",
            current_role=Role.OPERATOR,
        )
    assert exc_info.value.code == "VALIDATION_ERROR"

    # dither_hz must be 0 <= dither_hz <= 250
    with pytest.raises(ProtocolCommandError) as exc_info:
        validate_inbound_message(
            {"version": PROTOCOL_VERSION, "type": "MITIGATION_COMMAND", "room_id": "HUSH-100", "command_id": "c1", "reduction_ratio": 0.5, "ramp_ms": 250, "dither_hz": 300.0, "timestamp": time.time()},
            expected_room_id="HUSH-100",
            current_role=Role.OPERATOR,
        )
    assert exc_info.value.code == "VALIDATION_ERROR"
