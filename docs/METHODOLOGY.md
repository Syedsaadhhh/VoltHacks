# CutHush Methodology & Engineering Architecture

## 1. System Vision
> **CutHush** — *A machine that hears its own instability and changes behavior before the vibration becomes damage.*

In high-speed CNC machining, regenerative chatter occurs when cutting forces synchronize with structural vibration modes, producing catastrophic tool wear, ruined surface finishes, or spindle damage. CutHush addresses this through an acoustic governor architecture that closes the loop between machine sound and feed/spindle mitigation.

Run 1 establishes the foundational two-device physical loop:
phone speaker → air → laptop microphone → live spectrum → WebSocket command → phone speaker response

---

## 2. Hardware-in-the-Loop Audio Architecture

`
+-------------------------------------------------------------------------+
|                         BENCH MACHINE NODE (Phone)                      |
|                                                                         |
|  [Explicit Gesture: Arm] -> [AudioContext]                              |
|          |                                                              |
|          +---> 200 Hz Fundamental (Sine)                                |
|          +---> 400 Hz Tooth-Pass Harmonic (Triangle)                    |
|          +---> Filtered Noise Texture (Bandpass 800 Hz)                 |
|          +---> 2400 Hz Chatter Proxy Tone (Sawtooth + 15 Hz AM Flutter) |
|          |                                                              |
|          v                                                              |
|   [Master Gain] -> [Phone Loudspeaker]                                  |
|          ^                                                              |
|          | (Local Watchdog: >1200ms without heartbeat -> SAFE_HOLD)     |
+----------|--------------------------------------------------------------+
           | (Physical Airborne Sound Wave)
           v
+-------------------------------------------------------------------------+
|                           AIR ACOUSTIC PATH                             |
+-------------------------------------------------------------------------+
           |
           v
+-------------------------------------------------------------------------+
|                           LIVE_MIC (Laptop)                             |
|                                                                         |
|  [getUserMedia (echoCancellation: false, noiseSuppression: false)]      |
|          |                                                              |
|          v                                                              |
|  [Hardware Sample Rate Readout: 44.1k/48k Hz]                           |
|          |                                                              |
|          v                                                              |
|  [Web Audio AnalyserNode (FFT 2048)] -> [Live Spectrum Canvas]          |
|          |                                                              |
|          +---> Tap / Voice Liveness Meter                               |
|          +---> Target Band Visualizer (2.4 kHz)                         |
|          +---> Manual Mitigation Dispatch (Run 1 Closed Loop)           |
+----------|--------------------------------------------------------------+
           |
           | WebSocket (JSON Protocol v1.0.0)
           v
+-------------------------------------------------------------------------+
|                      CUTHUSH BACKEND ROOM ROUTER                        |
|                                                                         |
|  - Room Code Generation (e.g. HUSH-842)                                 |
|  - Role Pairing (operator <-> node)                                     |
|  - 500ms Active Heartbeat Broadcast                                     |
|  - Bidirectional Command & ACK Relay                                    |
+-------------------------------------------------------------------------+
`

---

## 3. Truth & Boundary Declaration

1. **Bench Simulation, Not Field CNC**: The phone is labeled BENCH MACHINE NODE. It is a deterministic audio synthesizer proxy designed to emit controlled acoustic profiles. It is never called a real machine tool.
2. **True Unprocessed Microphone Data**: The laptop microphone is labeled LIVE_MIC. Software audio post-processing (echoCancellation, 
oiseSuppression, utoGainControl) is explicitly requested off. The system reads and displays the browser-granted settings directly.
3. **No Premature Claims**: In Run 1, chatter detection algorithms are not claimed. The objective is establishing the physical and network loop between the devices.
4. **Node-Local Fail-Safe**: The node contains an independent heartbeat watchdog. If the controller stops communicating for 1200ms, the node ramps its audio to zero and enters SAFE_HOLD without requiring a server shutdown command.
5. **Replay Fixture**: An in-browser synthetic spectrum generator labeled REPLAY_FIXTURE is provided for CI, headless environments, and judges without a second device.

---

## 4. Typed Protocol Schema (v1.0.0)

All WebSocket communication uses typed JSON messages:
- HELLO: Identifies role (operator or 
ode) and room ID.
- PAIR: Dispatched by the server when peers enter/leave the room.
- HEARTBEAT: 500ms heartbeat from operator/server to node with sequence counter.
- NODE_READY: Node announces armed state upon user touch gesture.
- MITIGATION_COMMAND: Operator sends mitigation parameters (reduction ratio, ramp duration, frequency dither).
- COMMAND_ACK: Node confirms mitigation applied with round-trip execution latency.
- SAFE_HOLD: Node broadcasts fail-safe activation upon heartbeat expiration.
