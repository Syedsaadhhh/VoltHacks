from enum import Enum
from typing import Annotated, Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field, TypeAdapter, ValidationError

PROTOCOL_VERSION = "1.0.0"

class Role(str, Enum):
    OPERATOR = "operator"
    NODE = "node"

class MessageType(str, Enum):
    HELLO = "HELLO"
    PAIR = "PAIR"
    HEARTBEAT = "HEARTBEAT"
    NODE_READY = "NODE_READY"
    START_PROFILE = "START_PROFILE"
    INJECT_INSTABILITY = "INJECT_INSTABILITY"
    MITIGATION_COMMAND = "MITIGATION_COMMAND"
    COMMAND_ACK = "COMMAND_ACK"
    SAFE_HOLD = "SAFE_HOLD"
    ERROR = "ERROR"

class BaseMessage(BaseModel):
    version: str = Field(default=PROTOCOL_VERSION)
    type: MessageType
    room_id: str = Field(..., min_length=1)
    sender_role: Optional[Role] = None
    timestamp: float

class HelloMessage(BaseMessage):
    type: Literal[MessageType.HELLO] = MessageType.HELLO
    client_id: str = Field(..., min_length=1)
    role: Role

class PairMessage(BaseMessage):
    type: Literal[MessageType.PAIR] = MessageType.PAIR
    role: Role
    paired: bool
    peers: List[str] = Field(default_factory=list)

class HeartbeatMessage(BaseMessage):
    type: Literal[MessageType.HEARTBEAT] = MessageType.HEARTBEAT
    seq: int = Field(..., ge=1)
    interval_ms: int = Field(default=500, ge=100, le=5000)

class NodeReadyMessage(BaseMessage):
    type: Literal[MessageType.NODE_READY] = MessageType.NODE_READY
    armed: bool
    label: str = Field(default="BENCH MACHINE NODE", min_length=1)

class StartProfileMessage(BaseMessage):
    type: Literal[MessageType.START_PROFILE] = MessageType.START_PROFILE
    profile_type: str = Field(default="NOMINAL", min_length=1)
    parameters: Dict[str, Any] = Field(default_factory=dict)

class InjectInstabilityMessage(BaseMessage):
    type: Literal[MessageType.INJECT_INSTABILITY] = MessageType.INJECT_INSTABILITY
    active: bool
    incident_id: str = Field(..., min_length=1)
    target_freq_hz: float = Field(default=2400.0, ge=20.0, le=20000.0)
    seed: int = Field(default=2026)

class MitigationCommandMessage(BaseMessage):
    type: Literal[MessageType.MITIGATION_COMMAND] = MessageType.MITIGATION_COMMAND
    command_id: str = Field(..., min_length=1)
    reduction_ratio: float = Field(default=0.5, gt=0.0, le=1.0)
    ramp_ms: int = Field(default=250, ge=50, le=2000)
    dither_hz: float = Field(default=40.0, ge=0.0, le=250.0)
    reason: str = Field(default="MANUAL_RUN_1", min_length=1)

class CommandAckMessage(BaseMessage):
    type: Literal[MessageType.COMMAND_ACK] = MessageType.COMMAND_ACK
    command_id: str = Field(..., min_length=1)
    applied: bool
    state_after: str = Field(..., min_length=1)
    latency_ms: Optional[float] = Field(default=None, ge=0.0)

class SafeHoldMessage(BaseMessage):
    type: Literal[MessageType.SAFE_HOLD] = MessageType.SAFE_HOLD
    reason: str = Field(..., min_length=1)
    last_heartbeat_age_ms: float = Field(..., ge=0.0)

class ErrorMessage(BaseMessage):
    type: Literal[MessageType.ERROR] = MessageType.ERROR
    code: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)

InboundClientMessage = Annotated[
    Union[
        HelloMessage,
        NodeReadyMessage,
        StartProfileMessage,
        InjectInstabilityMessage,
        MitigationCommandMessage,
        CommandAckMessage,
        SafeHoldMessage,
    ],
    Field(discriminator="type"),
]

inbound_adapter = TypeAdapter(InboundClientMessage)

OPERATOR_ALLOWED_TYPES = {
    MessageType.HELLO,
    MessageType.MITIGATION_COMMAND,
}

NODE_ALLOWED_TYPES = {
    MessageType.HELLO,
    MessageType.NODE_READY,
    MessageType.START_PROFILE,
    MessageType.INJECT_INSTABILITY,
    MessageType.COMMAND_ACK,
    MessageType.SAFE_HOLD,
}

class ProtocolError(Exception):
    def __init__(self, code: str, message: str, ws_close_code: Optional[int] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.ws_close_code = ws_close_code

class ProtocolFatalError(ProtocolError):
    def __init__(self, code: str, message: str, ws_close_code: int = 1002):
        super().__init__(code, message, ws_close_code)

class ProtocolCommandError(ProtocolError):
    def __init__(self, code: str, message: str):
        super().__init__(code, message, None)

def validate_inbound_message(
    raw_dict: dict,
    expected_room_id: str,
    current_role: Optional[Role] = None,
) -> InboundClientMessage:
    if not isinstance(raw_dict, dict):
        raise ProtocolFatalError("INVALID_PAYLOAD", "Payload must be a JSON object", ws_close_code=1003)

    version = raw_dict.get("version")
    if version != PROTOCOL_VERSION:
        raise ProtocolFatalError(
            "VERSION_MISMATCH",
            f"Expected protocol {PROTOCOL_VERSION}, got {version}",
            ws_close_code=1002,
        )

    room_id = raw_dict.get("room_id")
    if not room_id or room_id != expected_room_id:
        raise ProtocolFatalError(
            "ROOM_MISMATCH",
            f"Payload room_id '{room_id}' does not match connection room '{expected_room_id}'",
            ws_close_code=1008,
        )

    msg_type = raw_dict.get("type")

    # If role is not yet established, first message must be HELLO
    if current_role is None:
        if msg_type != MessageType.HELLO.value:
            raise ProtocolFatalError(
                "UNEXPECTED_MESSAGE",
                "First message must be HELLO",
                ws_close_code=1002,
            )
        try:
            parsed = inbound_adapter.validate_python(raw_dict)
        except ValidationError as val_err:
            first_err = val_err.errors()[0]["msg"] if val_err.errors() else str(val_err)
            raise ProtocolFatalError(
                "INVALID_HELLO",
                f"Invalid HELLO message: {first_err}",
                ws_close_code=1003,
            )
        return parsed

    # Connection already established with current_role
    try:
        parsed = inbound_adapter.validate_python(raw_dict)
    except ValidationError as val_err:
        first_err = val_err.errors()[0]["msg"] if val_err.errors() else str(val_err)
        raise ProtocolCommandError(
            "VALIDATION_ERROR",
            f"Message validation failed: {first_err}",
        )

    # Role permission check
    if current_role == Role.OPERATOR:
        if parsed.type not in OPERATOR_ALLOWED_TYPES:
            raise ProtocolCommandError(
                "ROLE_PERMISSION_DENIED",
                f"Operator role is not authorized to send message type {parsed.type.value}",
            )
    elif current_role == Role.NODE:
        if parsed.type not in NODE_ALLOWED_TYPES:
            raise ProtocolCommandError(
                "ROLE_PERMISSION_DENIED",
                f"Node role is not authorized to send message type {parsed.type.value}",
            )

    return parsed