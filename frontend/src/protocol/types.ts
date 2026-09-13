export const PROTOCOL_VERSION = "1.0.0";

export type Role = "operator" | "node";

export type AudioProfileType = "NOMINAL" | "INSTABILITY" | "STOPPED";

export type SystemState =
  | "UNPAIRED"
  | "READY"
  | "CALIBRATING"
  | "NOMINAL"
  | "SUSPECT"
  | "MITIGATING"
  | "VERIFYING"
  | "RECOVERED"
  | "UNRESOLVED"
  | "SAFE_HOLD"
  | "COMPLETE";

export interface HelloMessage {
  version: string;
  type: "HELLO";
  room_id: string;
  client_id: string;
  role: Role;
  timestamp: number;
}

export interface PairMessage {
  version: string;
  type: "PAIR";
  room_id: string;
  role: Role;
  paired: boolean;
  peers: string[];
  timestamp: number;
}

export interface HeartbeatMessage {
  version: string;
  type: "HEARTBEAT";
  room_id: string;
  seq: number;
  interval_ms: number;
  timestamp: number;
}

export interface NodeReadyMessage {
  version: string;
  type: "NODE_READY";
  room_id: string;
  armed: boolean;
  label: string;
  timestamp: number;
}

export interface StartProfileMessage {
  version: string;
  type: "START_PROFILE";
  room_id: string;
  profile_type: "NOMINAL" | "IDLE";
  parameters?: Record<string, unknown>;
  timestamp: number;
}

export interface InjectInstabilityMessage {
  version: string;
  type: "INJECT_INSTABILITY";
  room_id: string;
  active: boolean;
  incident_id: string;
  target_freq_hz: number;
  seed?: number;
  timestamp: number;
}

export interface MitigationCommandMessage {
  version: string;
  type: "MITIGATION_COMMAND";
  room_id: string;
  command_id: string;
  reduction_ratio: number;
  ramp_ms: number;
  dither_hz: number;
  reason: string;
  timestamp: number;
}

export interface CommandAckMessage {
  version: string;
  type: "COMMAND_ACK";
  room_id: string;
  command_id: string;
  applied: boolean;
  state_after: string;
  latency_ms?: number;
  timestamp: number;
}

export interface SafeHoldMessage {
  version: string;
  type: "SAFE_HOLD";
  room_id: string;
  reason: string;
  last_heartbeat_age_ms: number;
  timestamp: number;
}

export interface ErrorMessage {
  version: string;
  type: "ERROR";
  room_id: string;
  code: string;
  message: string;
  timestamp: number;
}

export type WebSocketMessage =
  | HelloMessage
  | PairMessage
  | HeartbeatMessage
  | NodeReadyMessage
  | StartProfileMessage
  | InjectInstabilityMessage
  | MitigationCommandMessage
  | CommandAckMessage
  | SafeHoldMessage
  | ErrorMessage;

export interface MicSettings {
  sampleRate: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  channelCount?: number;
  deviceId?: string;
}
