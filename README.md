# CutHush

> A browser-based acoustic governor that hears persistent machine instability, responds through a paired device, and proves whether the response worked.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Open_CutHush-18c7c9?style=for-the-badge)](https://cuthush-live.onrender.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-f2a93b?style=for-the-badge)](LICENSE)
[![Built for VoltHacks 2026](https://img.shields.io/badge/Built_for-VoltHacks_2026-15171c?style=for-the-badge)](https://cuthush-live.onrender.com/)

## The idea in 10 seconds

A phone plays the role of a bench machine. A laptop listens through its real microphone. When CutHush detects persistent chatter, it sends a bounded mitigation command to the phone and measures whether the unstable frequency actually falls.

No special sensor kit is required for the demonstration.

**[Open the live demo](https://cuthush-live.onrender.com/)**

## Why CutHush exists

Machine instability is often noticed only after a person hears it, inspects the process, and decides what to change. That delay can mean poor surface quality, wasted material, damaged tooling, and avoidable downtime.

CutHush explores a narrower question:

**Can an ordinary browser hear a persistent acoustic warning, trigger a safe response, and produce evidence that the response helped?**

## The physical loop

```text
Phone speaker
    ↓ sound through the room
Laptop microphone
    ↓ live frequency analysis
Persistence decision
    ↓ WebSocket command
Phone mitigation
    ↓
Measured recovery or unresolved result
```

The phone is clearly labeled **BENCH MACHINE NODE**. It is an audio proxy, not a CNC machine. The laptop microphone, room audio path, WebSocket exchange, watchdog, and recovery measurement are real.

## The judge moment

Choose **Run the same-seed judge proof**.

CutHush replays the same seeded instability twice:

| Phase | Governor | What CutHush measures |
| --- | --- | --- |
| A | Off | Unmitigated instability exposure |
| B | On | Detection, response, and measured reduction |

A result becomes **RECOVERED** only when the target band drops by at least 6 dB for eight consecutive verification frames. If that condition is not met, CutHush reports **UNRESOLVED**.

There is no prefilled success state.

## What you can see

- Live microphone activity and the granted sample rate
- A real-time 0 to 3.5 kHz spectrum
- Nominal and 2.4 kHz chatter reference bands
- Adaptive three-second baseline calibration
- A 4-of-6 persistence gate that rejects brief spikes
- Typed WebSocket commands and acknowledgements
- Command round-trip timing
- A 1.2-second independent phone watchdog
- `SAFE_HOLD` when controller heartbeats disappear
- Same-seed A/B evidence for a repeatable judge demo
- SHA-256 hash-chained proof capsules that export as JSON

## System states

| State | Meaning |
| --- | --- |
| `UNPAIRED` | No bench node is connected |
| `READY` | Operator and node are connected |
| `CALIBRATING` | CutHush is learning the local baseline |
| `NOMINAL` | The signal is within the expected range |
| `SUSPECT` | Persistent target-band energy is developing |
| `MITIGATING` | A bounded response has been dispatched |
| `VERIFYING` | CutHush is measuring the result |
| `RECOVERED` | Sustained reduction was measured |
| `UNRESOLVED` | The recovery requirement was not met |
| `SAFE_HOLD` | The node stopped itself after heartbeat loss |

## Try the two-device demo

1. Open [CutHush](https://cuthush-live.onrender.com/) on a laptop.
2. Select **Start a live test cell**.
3. Allow microphone access and calibrate for three seconds.
4. Open the pairing link or scan the QR code with a phone on the same network.
5. Tap **Arm Machine Node** on the phone.
6. Start the nominal profile.
7. Inject the instability profile.
8. Watch CutHush detect persistence, send mitigation, receive the acknowledgement, and verify the result.
9. Close the laptop tab to demonstrate the phone entering `SAFE_HOLD`.

For the fastest single-device review, choose **Run the same-seed judge proof** from the opening screen.

## Architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Interface | React, TypeScript, Vite | Operator view, node view, spectrum, Judge Mode |
| Audio | Web Audio API | Synthesis, microphone capture, FFT analysis |
| Control | FastAPI, WebSockets, Pydantic | Rooms, heartbeats, validated protocol messages |
| Evidence | Web Crypto API, SHA-256 | Tamper-evident proof chain and JSON export |
| Delivery | Render Static Site and Web Service | CDN frontend plus API and WebSocket backend |

The CDN frontend loads immediately and wakes the backend in the background. REST and WebSocket traffic use the same production API origin.

More detail is available in [the architecture document](docs/ARCHITECTURE.md).

## Run locally

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
```

### macOS or Linux

```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

Open `http://localhost:5173` on the laptop. For phone pairing, use the LAN address displayed by the app and keep both devices on the same network.

## Verify the release

```bash
python -m pytest backend/tests -q
npm --prefix frontend ci
npm --prefix frontend run build
```

## Project structure

```text
backend/
  app/                 FastAPI service, protocol, rooms, proof storage
  tests/               Backend and WebSocket tests
frontend/
  src/audio/           Synthesizer, microphone analyzer, governor
  src/components/      Spectrum, liveness, and pairing components
  src/routes/          Opening, operator, node, proof, methodology
  src/proof/           Evidence integrity helpers
docs/                  Architecture, demo, release, and submission material
scripts/               Cross-platform development launchers
Dockerfile             Production container
render.yaml            Render deployment definition
```

## Honest boundary

CutHush demonstrates the control architecture with a browser microphone and a bench audio proxy. It does not claim CNC field validation, safety certification, production actuator authority, or diagnostic certainty.

A production version would require machine-specific sensing, controlled trials, actuator interlocks, risk analysis, and validation under the relevant industrial safety standards.

## Documentation

- [Architecture and state model](docs/ARCHITECTURE.md)
- [Demo script](docs/DEMO_SCRIPT.md)
- [Final release checklist](docs/FINAL_RELEASE_CHECKLIST.md)
- [Devpost submission draft](docs/DEVPOST_SUBMISSION.md)
- [Live methodology page](https://cuthush-live.onrender.com/?page=methodology)

## License

CutHush is available under the [MIT License](LICENSE).
