# CutHush

**A browser-native acoustic governor that hears persistent machine instability, issues a bounded response, and proves whether recovery actually happened.**

CutHush turns two ordinary devices into a hardware-in-the-loop control demo:

`phone speaker → air → laptop microphone → spectral decision → WebSocket command → phone response`

The phone is deliberately labeled **BENCH MACHINE NODE**. It is an audio proxy, not a CNC machine. The laptop microphone and network path are real; deterministic replay is always labeled **REPLAY_FIXTURE**.

## The judge moment

Press **Run same-seed proof**. CutHush runs the identical seeded instability twice:

1. Governor OFF: measure unmitigated exposure.
2. Governor ON: detect 4-of-6 persistent frames, command mitigation, and verify the result.

A run earns **RECOVERED** only after at least 6 dB target-band reduction persists for eight frames. Otherwise it ends **UNRESOLVED**. Completed evidence is persisted, SHA-256 verified, chained to the previous run, and exportable as JSON.

## What is real

- browser microphone capture with granted sample rate and audio-processing settings shown;
- 4096-point FFT and adaptive three-second baseline;
- target-band prominence and persistence decision;
- role-validated WebSocket control messages;
- phone watchdog that independently enters SAFE_HOLD after 1.2 seconds without controller heartbeat;
- same-seed A/B replay for a fast, reproducible judge demo.

## Run locally

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
```

macOS/Linux:

```bash
./scripts/dev.sh
```

Open the laptop URL, start a live cell, then use the displayed LAN address in the pairing card so the QR code is reachable from the phone.

## Verification

```bash
python -m pytest backend/tests -vv --tb=short
npm --prefix frontend ci
npm --prefix frontend run build
```

GitHub Actions enforces a two-minute backend test timeout and a four-minute frontend build timeout.

## Production

The included multi-stage `Dockerfile` builds the Vite frontend and serves it with FastAPI. `render.yaml` defines a health-checked Render web service.

## Evidence and method

- [90-second judge demo](docs/DEMO_SCRIPT.md)
- [Architecture and state model](docs/ARCHITECTURE.md)
- [Methodology in the app](/methodology)
- [Release checklist](docs/FINAL_RELEASE_CHECKLIST.md)
- [Devpost draft](docs/DEVPOST_SUBMISSION.md)

## Limits

This prototype demonstrates a closed-loop architecture with a bench audio proxy. It does not claim field validation, CNC safety certification, or production actuator authority.
