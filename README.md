# CutHush

> **The machine hears itself.**  
> *A machine that hears its own instability and changes behavior before the vibration becomes damage.*

[![Run 1 Status](https://img.shields.io/badge/Run%201-PASSED%20(Automated)-success)](#run-1-status)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![VoltHacks 2026](https://img.shields.io/badge/VoltHacks-2026-amber)](https://github.com/Syedsaadhhh/VoltHacks)

---

## Run 1 Status

Run 1 of 3 delivers the foundational two-device physical loop:
**phone speaker → air → laptop microphone → live spectrum → WebSocket command → phone speaker response**

- **Backend Protocol & Rooms**: Verified with automated pytest suite (5/5 tests passing).
- **Frontend Typecheck & Build**: Production build passing (	sc -b && vite build).
- **Physical Device Gate**: MANUAL DEVICE GATE PENDING (Instructions below for live physical test).

---

## Truth and Boundary Declaration

CutHush adheres to strict truth labeling:
- **Phone**: Labeled BENCH MACHINE NODE. It is an audio synthesizer proxy emitting repeatable rotating-machine profiles into the air, **not a real CNC machine**.
- **Laptop**: Labeled LIVE_MIC. Raw microphone audio with browser filtering disabled (echoCancellation: false, 
oiseSuppression: false, utoGainControl: false).
- **Replay**: Deterministic in-browser simulation clearly labeled REPLAY_FIXTURE.
- **Metrics**: No prefilled latency, dB metrics, or fake success animations.

---

## Quickstart (60 Seconds)

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### Windows (PowerShell)
`powershell
# 1. Install backend requirements
pip install -r backend/requirements.txt

# 2. Install frontend packages
npm --prefix frontend install

# 3. Launch both services
powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
`

### Unix / macOS (Bash)
`ash
# 1. Install backend requirements
pip install -r backend/requirements.txt

# 2. Install frontend packages
npm --prefix frontend install

# 3. Launch both services
chmod +x scripts/dev.sh
./scripts/dev.sh
`

Open your browser at http://localhost:5173.

---

## Verifying the Two-Device Physical Loop

1. **Open Operator Test Cell**: Click **Start a live test cell** on your laptop. A room code (e.g. HUSH-482) and QR code appear.
2. **Connect Phone**: Scan the QR code with your phone (or open the link in a second browser window).
3. **Arm Phone Node**: Tap **Arm Machine Node** to satisfy the mobile browser gesture requirement.
4. **Enable Laptop Mic**: On the laptop, click **Enable Microphone**. Observe actual granted sample rate and disabled DSP filters.
5. **Start Audio Profile**:
   - On the phone, tap **Nominal Machine**. A 200 Hz fundamental + 400 Hz tooth-pass proxy tone will emit from the speaker.
   - Tap **Inject Instability**. A distinct 2400 Hz chatter tone with 15 Hz amplitude flutter becomes audible.
6. **Observe Spectrum**: On the laptop, watch the live FFT spectrum react to the sound coming through the air.
7. **Trigger Mitigation**: Click **Send Manual Mitigation Command** on the laptop. The phone speaker will audibly attenuate the chatter tone and apply a frequency dither, followed by an immediate ACK in the operator log.
8. **Test Watchdog**: Disconnect the laptop or stop the server; within 1.2s of lost heartbeats, the phone autonomously silences its audio and enters SAFE_HOLD.

---

## Testing

`ash
# Run backend tests
python -m pytest backend/tests -v

# Run frontend typecheck and build
npm --prefix frontend run build
`
