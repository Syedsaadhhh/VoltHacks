# CUTHUSH

## VoltHacks 2026 Three Run Antigravity Execution Master

**Project:** CutHush  
**One-line promise:** A machine that hears its own instability and changes behavior before the vibration becomes damage.  
**Repository:** https://github.com/Syedsaadhhh/VoltHacks  
**Submission deadline:** September 14, 2026 at 2:00 AM PKT  
**Execution model:** Exactly three cumulative Google Antigravity runs  
**Status at planning:** Local folder named `VoltHacks` exists; connected GitHub repository exists and is empty.

---

## HOW TO USE THIS FILE

1. Put this file in the root of the local `VoltHacks` folder.
2. Open that exact folder in Google Antigravity.
3. Paste **Run 1 only** from this file.
4. Wait for Antigravity to finish, commit, push, and produce `docs/execution/RUN_1_REPORT.md`.
5. Inspect the report and confirm the acceptance gate passed.
6. Paste Run 2, then repeat for Run 3.
7. Never paste all three runs together.

If a run is interrupted, paste the same run again and tell Antigravity to resume from the repository’s current state. It must inspect existing work before editing and must not restart the repository.

---

# FINAL STRATEGIC DECISION

The Gemini research selected **ResoPulse**, a browser-based acoustic and inertial governor for CNC chatter. The concept is strong, but several claims and implementation choices were too aggressive for a one-day build:

- `85 ms` detection was asserted before measurement.
- `18 dB` recovery was asserted before a real test.
- consumer microphones were treated like calibrated industrial sensors;
- direct CNC actuation was described without a machine, controller, safety review, or correct controller-specific override protocol;
- fixed 1.8–3.5 kHz thresholds were presented as universal;
- the phone accelerometer was assumed to deliver a stable 100 Hz;
- SHA-256 ledger proof was positioned as a main differentiator even though another current VoltHacks entry already centers that mechanic;
- an LLM was asked to infer tool wear from insufficient evidence;
- the name ResoPulse already belongs to at least two unrelated GitHub projects.

We are **not rejecting the concept**. We are converting it into a more defensible and more visually convincing entry.

## Final product identity

**Name:** CutHush  
**Tagline:** The machine hears itself.  
**Judge sentence:** CutHush closes a real loop from sound in the room, to a machine decision, to a physical response, to measured recovery.

## What CutHush actually is

CutHush is a browser-based, two-device hardware-in-the-loop demonstrator for adaptive machine-chatter control.

- A phone acts as the bench machine node.
- Its speaker physically emits a repeatable rotating-machine acoustic profile.
- A laptop microphone measures that real sound through the air.
- The laptop detects a persistent, non-harmonic instability relative to a freshly measured baseline.
- The governor sends a mitigation command back to the phone.
- The phone changes its physical acoustic output.
- The laptop measures whether target-band energy actually falls.
- A local watchdog on the phone enters safe hold if controller heartbeats disappear.
- The system compares the same deterministic incident with the governor disabled and enabled.

This is a real browser → speaker → air → microphone → decision → network command → speaker closed loop. It is not field validation on a CNC machine, and it must never be described as one. It demonstrates the control architecture and provides an adapter boundary for later GRBL or industrial-controller integration.

## Confident claims we may make

Make these claims prominently after the relevant acceptance tests pass:

- CutHush performs live acoustic sensing using the laptop microphone.
- It establishes a per-session baseline instead of relying on one universal noise threshold.
- It detects a persistent narrowband instability distinct from configured rotational harmonics.
- It sends an automatic mitigation command to a separate physical browser node.
- The separate node changes its audible output in response.
- CutHush measures the resulting target-band reduction.
- It reports measured median and p95 decision latency from the actual run.
- The phone’s local watchdog enters safe hold when controller heartbeats stop.
- The same incident seed can be compared with the governor disabled and enabled.
- Every chart, number, and conclusion carries a source label: `LIVE_MIC`, `LIVE_NODE`, `BENCH_SIMULATION`, `REPLAY_FIXTURE`, or `DETERMINISTIC_FALLBACK`.

## Claims that are forbidden

Never claim:

- prevention of real CNC tool fracture;
- industrial-grade sensing;
- certified safety;
- universal chatter detection;
- a guaranteed latency before measuring it;
- a guaranteed dB reduction before measuring it;
- direct control of a real CNC machine in this release;
- prediction of tool wear or remaining useful life from this prototype;
- immutable data, blockchain, or tamper prevention;
- that bench simulation proves field performance;
- that simulated, fixture, or fallback data is live.

Confidence comes from showing exactly what is real and measuring it—not from inflating the scope.

---

# COMPETITIVE COLLISION REVIEW

The repository search was performed before this execution plan was written.

## Current VoltHacks repositories inspected

| Repository | Visible concept | Collision with the original research | CutHush response |
|---|---|---|---|
| `Shital2108/trustmesh` | AI proposal, deterministic actuator guard, simulated valve, SHA-256 chain | High overlap with governor plus ledger framing | Make real acoustic hardware-in-the-loop and same-incident recovery the hero; hash is supporting evidence only |
| `mskutlu/volthacks-voltguard` | Simulated energy fleet, anomaly detection, diagnosis, fallback | Overlap with monitoring and automatic response | Avoid fleet/dashboard framing; show one physical loop and measured intervention |
| `painbaba/gridsense` | Simulated smart meters, detectors, case files, replay | Overlap with simulation, evidence, replay | Replay only validates an actual live run; the live phone-to-laptop loop remains central |
| `favour187/gridsentry` | Grid telemetry, deterministic faults, investigator reports | Overlap with explainable rules and operational console | Use an instrument/test-cell interface, not an operations dashboard |
| `dumbthing999-ui/sentryhive` | Wildfire sensor twin, multimodal fusion, extensive benchmark claims | Overlap with physical AI and sensor fusion | Report only runtime measurements and reproducible tests; do not prefill spectacular metrics |
| `lsh2546/gridkind-volthacks` | Microgrid decision twin, counterfactual policies, hashed decision proof | Overlap with A/B proof | Our comparison is tied to a real acoustic path and a physical responding node |
| `shannon-aurelia/the-cortex-node-volthacks` | Honest ESP32 digital twin for thought capture | Low domain overlap | Exceed it through a real cross-device physical loop |
| `AmRitJain0442/mantis-field-kit-volthacks` | Failure/recovery evidence workbench | Partial recovery/proof overlap | Keep proof small and subordinate to live control |
| `zhuang768/volthacks-nexuscity` | Broad smart-city incident orchestration | No direct domain collision | Win through narrowness and visibly real execution |
| `moscraciunxxx/voltdecision` | Bioelectric decision twin and same-seed repair | Counterfactual-mechanics overlap | Use measured acoustic response rather than a purely simulated tissue twin |

Other visible VoltHacks repositories cluster around smart health, energy scheduling, smart grids, and broad digital twins. No inspected VoltHacks repository presented the same CNC chatter control experience.

## Related GitHub work outside VoltHacks

- `SatyamBhawsinghka/LBC_Project` describes neural-network chatter detection and control on CNC milling.
- `MhdPasandideh/Chatter-Detection` and `m-saket/chatter-detection-turning` analyze chatter from machining signals.
- `hardythomas000/chatter-detect` proposes real-time CNC chatter detection from microphone or accelerometer data.
- multiple vibration-monitoring projects use FFT, accelerometers, predictive maintenance, or bearing datasets.
- `AparCode/resopulse` is an audio-reactive visualizer.
- `PreisTomer/ResoPulse` is an electroporation digital twin.

These projects do not invalidate the problem. They prove it is real. CutHush must differentiate through:

1. zero-install, browser-first operation;
2. a real two-device physical acoustic loop;
3. an adaptive physics-guided detector rather than a generic ML classifier;
4. automatic physical response;
5. same-incident governor-off versus governor-on proof;
6. measured runtime latency and energy reduction;
7. a node-local heartbeat fail-safe;
8. radical truth-labeling of every data source.

Do not copy source code, visual identity, prose, diagrams, thresholds, or results from any repository above.

---

# PRODUCT AND ENGINEERING CONTRACT

## Core judge journey

The shortest complete journey is:

1. Open CutHush on the laptop.
2. Create a test cell and display a QR code.
3. Scan it with an Android phone.
4. Tap **Arm machine node** on the phone to unlock browser audio.
5. Grant microphone permission on the laptop.
6. Run a three-second ambient and nominal baseline.
7. Start the deterministic machine profile.
8. Introduce the seeded instability.
9. Watch CutHush move through `NOMINAL → SUSPECT → MITIGATING → VERIFYING → RECOVERED`.
10. Hear the phone’s tone physically change.
11. See the target-band energy fall or see the system honestly refuse to claim recovery.
12. Run the identical seed with the governor disabled.
13. Compare exposure, recovery time, and measured energy on one proof screen.
14. Stop controller heartbeats and show the phone’s local watchdog enter `SAFE_HOLD`.

## State machine

Use exactly these states:

- `UNPAIRED`
- `READY`
- `CALIBRATING`
- `NOMINAL`
- `SUSPECT`
- `MITIGATING`
- `VERIFYING`
- `RECOVERED`
- `UNRESOLVED`
- `SAFE_HOLD`
- `COMPLETE`

Every transition must contain:

- previous state;
- next state;
- timestamp;
- reason code;
- source label;
- measured evidence;
- session and run identifiers.

## Detection strategy

Do not hardcode one universal chatter frequency.

Use:

- actual `AudioContext.sampleRate`;
- microphone constraints requesting `echoCancellation: false`, `noiseSuppression: false`, and `autoGainControl: false`, while detecting and displaying what the browser actually granted;
- `AnalyserNode` with a practical FFT size such as 4096;
- a three-second nominal baseline;
- configured simulated RPM and flute count to calculate rotational and tooth-pass harmonics;
- conversion of dB bins into linear power before energy aggregation;
- adaptive peak prominence relative to the measured baseline;
- target-band energy ratio;
- exclusion windows around expected rotational harmonics;
- persistence across multiple analysis frames;
- an optional phone motion confidence signal, never a hard dependency;
- tunable thresholds shown in a methodology panel.

The default bench scenario may use a 400 Hz tooth-pass proxy and a 2.4 kHz instability tone, but the interface and algorithm must label these as scenario values, not universal CNC constants.

Use a conservative default decision rule:

- instability score above threshold on at least 4 of the last 6 frames;
- narrowband prominence materially above the calibrated baseline;
- target peak outside configured expected-harmonic exclusion windows;
- optional IMU agreement raises confidence but its absence does not block audio-only operation.

Do not display a guaranteed response time. Instrument each stage with `performance.now()` and report observed median and p95 detection-to-command and command-to-ack latency.

## Recovery rule

Recovery is earned, not animated.

After mitigation:

- compare target-band energy to the pre-mitigation window;
- require sustained reduction for a configurable verification window;
- default target: at least 6 dB reduction sustained for one second;
- if the target is missed, transition to `UNRESOLVED`;
- never force the UI to show green;
- report the observed dB change even when recovery fails.

## Bench machine node

The phone page must use Web Audio after an explicit user gesture.

Nominal profile:

- low-frequency rotational proxy;
- tooth-pass harmonic;
- modest broadband texture;
- stable amplitude.

Instability profile:

- narrowband tone at the configured instability frequency;
- amplitude modulation that makes the sound visibly and audibly unstable;
- deterministic seed and incident ID;
- optional `navigator.vibrate` pulse pattern where supported, labeled separately;
- optional DeviceMotion telemetry where supported and permitted.

Mitigation behavior:

- acknowledge the command;
- ramp output instead of discontinuously clicking;
- reduce unstable-component amplitude;
- apply a small deterministic frequency dither to represent a bench SSV proxy;
- send post-command node telemetry;
- make the physical sound change clearly audible.

Local fail-safe:

- receive controller heartbeats;
- if heartbeats are absent for more than 1.2 seconds while armed, the node itself ramps output to zero and enters `SAFE_HOLD`;
- this must work even when no further server command arrives;
- show the watchdog timer and last heartbeat on the phone.

## Proof model

The proof screen must focus on measured intervention, not cryptographic theater.

Compare the same incident seed across:

- governor disabled;
- governor enabled.

Show:

- incident ID and seed;
- input source;
- baseline duration;
- target frequency;
- pre- and post-mitigation target-band energy;
- measured change in dB;
- cumulative instability exposure;
- time to first detection;
- detection-to-command latency;
- command-to-node acknowledgment latency;
- recovery result;
- watchdog result;
- source labels;
- algorithm version.

An append-only SHA-256 event chain may protect the exported JSON Run Capsule, but describe it accurately as **tamper-evident within the exported chain**, not immutable or tamper-proof. It is not the hero feature.

## Optional AI role

The control path must never depend on an LLM.

If `FEATHERLESS_API_KEY` is available, a post-run endpoint may transform already-computed evidence into a concise operator briefing. It must:

- receive only structured measurements;
- return a strict schema;
- never diagnose tool wear or claim failure probability;
- never invent a number;
- identify itself as `FEATHERLESS`;
- time out quickly;
- fall back to a deterministic template labeled `DETERMINISTIC_FALLBACK`.

If the key is absent, the product remains complete.

---

# ARCHITECTURE

Use a single deployable service to reduce failure points.

## Stack

- Frontend: React, TypeScript, Vite
- Styling: authored CSS with design tokens; Tailwind is optional, not required
- Charts: lightweight Canvas/SVG; avoid a heavy dashboard library
- QR pairing: a small maintained QR component or an internal SVG QR helper
- Backend: Python 3.11+, FastAPI, Uvicorn
- Realtime: native FastAPI WebSockets
- Storage: SQLite for run/event/proof metadata, with an in-memory fallback clearly labeled
- DSP: browser Web Audio API
- Integrity: browser or backend SHA-256 over canonical JSON
- Testing: Vitest, pytest, FastAPI TestClient/WebSocket tests, and a small Playwright smoke journey if time permits
- Deployment: multi-stage Docker image serving the Vite build through FastAPI, plus `render.yaml`

## Suggested structure

```text
VoltHacks/
├── CUTHUSH_ANTIGRAVITY_3_RUN_MASTER.md
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── Dockerfile
├── render.yaml
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── protocol.py
│   │   ├── rooms.py
│   │   ├── runs.py
│   │   ├── proof.py
│   │   └── ai_brief.py
│   └── tests/
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── app/
│   │   ├── audio/
│   │   ├── protocol/
│   │   ├── proof/
│   │   ├── routes/
│   │   ├── components/
│   │   ├── styles/
│   │   └── test/
│   └── public/
├── fixtures/
│   ├── nominal.json
│   └── instability.json
├── docs/
│   ├── architecture.svg
│   ├── METHODOLOGY.md
│   ├── DEMO_SCRIPT.md
│   ├── DEVPOST_SUBMISSION.md
│   ├── COMPETITIVE_CHECK.md
│   └── execution/
└── scripts/
    ├── dev.ps1
    ├── dev.sh
    └── verify_release.py
```

## Realtime protocol

Use typed JSON messages with a protocol version.

Minimum message types:

- `HELLO`
- `PAIR`
- `HEARTBEAT`
- `NODE_READY`
- `START_PROFILE`
- `INJECT_INSTABILITY`
- `AUDIO_METRICS`
- `MOTION_METRICS`
- `STATE_TRANSITION`
- `MITIGATION_COMMAND`
- `COMMAND_ACK`
- `SAFE_HOLD`
- `RUN_COMPLETE`
- `ERROR`

Reject unknown message versions and malformed payloads. Never treat untrusted WebSocket text as code or instructions.

---

# EXPERIENCE AND VISUAL DIRECTION

CutHush must look like a focused industrial instrument, not a cyber dashboard.

## Visual system

- Background: warm graphite, near-black, and off-white—not pure black everywhere.
- Accent: safety amber for attention, signal cyan for measured input, controlled green only after verified recovery, vermilion for unresolved danger.
- Typography: Geist or Inter for interface; a restrained mono face for measurements.
- Thin neutral borders, strong spacing, and large legible numbers.
- No cyberpunk grids.
- No glowing neon everywhere.
- No excessive glass panels.
- No fake 3D factory.
- No stock AI robot imagery.
- Motion must explain state changes, not decorate them.

## Core surfaces

### 1. Opening

Headline:

> A machine should not wait for a person to hear it failing.

Primary action:

> Start a live test cell

Secondary action:

> Watch a verified replay

The opening must explain the product in under 20 seconds.

### 2. Pairing

- room code;
- QR code;
- laptop and phone role cards;
- clear permission status;
- microphone source;
- connection heartbeat;
- one sentence describing the physical loop.

### 3. Test Cell

This is the hero surface.

- one large current-state word;
- one dominant live spectrum/waterfall;
- target-band marker;
- expected harmonic markers;
- current measured prominence;
- compact timeline of state transitions;
- physical node status;
- governor arm/disarm switch;
- no grid of fifteen KPI cards.

### 4. Machine Node

- full-screen phone interface;
- room/session identity;
- explicit `BENCH MACHINE NODE` label;
- large arm button;
- current profile and actuator state;
- heartbeat countdown;
- local safe-hold indicator;
- optional motion permission and status;
- prevent screen sleep where possible.

### 5. Proof

- same incident ID displayed once;
- two columns: Governor Off and Governor On;
- a synchronized energy timeline;
- measured outcome table;
- source/provenance legend;
- Run Capsule export;
- link to methodology.

### 6. Methodology

- what is real;
- what is simulated;
- what is measured;
- what is inferred;
- threshold method;
- limits;
- path to a real machine adapter.

---

# RUN 1 PROMPT

Paste the entire block below into Google Antigravity.

---

You are Run 1 of exactly three execution runs for the VoltHacks 2026 project **CutHush**.

Work directly inside the currently open `VoltHacks` folder. Do not create a second project folder. Inspect the directory, Git state, available toolchains, and any `AGENTS.md` before editing. Preserve any existing user work.

The target repository is:

`https://github.com/Syedsaadhhh/VoltHacks`

If the folder is not initialized as Git, initialize it on `main`. If no remote exists, add the URL above as `origin`. If an origin already exists, verify it and do not replace it silently. Do not create pull requests or extra branches.

## Mission

Deliver the smallest working proof of the real two-device physical loop:

**phone speaker → air → laptop microphone → live spectrum → WebSocket command → phone speaker response**

Do not build the polished product yet. Resolve the irreversible technical risks first.

## Build

1. Scaffold a React + TypeScript + Vite frontend and a Python FastAPI backend.
2. Establish a single typed WebSocket room protocol with `operator` and `node` roles.
3. Create:
   - an operator/laptop route;
   - a machine-node/phone route;
   - a minimal opening route that creates a short room code.
4. Generate a QR code linking the phone to the current room.
5. On the phone:
   - require an explicit **Arm machine node** gesture;
   - initialize Web Audio only after that gesture;
   - synthesize a deterministic nominal machine profile;
   - synthesize a deterministic instability profile;
   - accept a typed mitigation command and audibly change output;
   - receive heartbeats and expose the countdown.
6. On the laptop:
   - request microphone permission with processing constraints disabled where supported;
   - show actual granted settings;
   - read the actual sample rate;
   - render a simple live spectrum;
   - visibly prove microphone liveness with a tap/voice response;
   - send a manual mitigation command for Run 1 only.
7. Add a deterministic in-browser replay fixture for development and CI, clearly labeled `REPLAY_FIXTURE`.
8. Add `GET /api/health`.
9. Add concise protocol and room lifecycle tests.
10. Add Windows and Unix development launch scripts.

## Safety and truth requirements

- Label the phone `BENCH MACHINE NODE`.
- Label the laptop microphone `LIVE_MIC`.
- Never call the bench node a real CNC machine.
- Do not claim chatter detection yet.
- Do not prefill latency or dB metrics.
- Do not use a fake success animation.
- If microphone permission fails, show a real error and offer labeled replay mode.
- If the second device cannot connect, preserve the working laptop replay path.

## Run 1 acceptance gate

The run passes only if:

1. backend tests pass;
2. frontend typecheck and build pass;
3. two WebSocket roles can join the same room;
4. node heartbeat is visible;
5. the phone or a second browser can produce nominal and unstable audio;
6. the laptop live microphone spectrum responds;
7. a manual mitigation command changes the node audio and produces an acknowledgment;
8. replay mode is unmistakably labeled;
9. `/api/health` returns success;
10. the app can be launched using documented commands.

If physical two-device testing is unavailable in the environment, do not pretend it passed. Mark it `MANUAL DEVICE GATE PENDING`, provide exact laptop and phone steps, and complete every automated part.

## Repository output

Create:

- initial `README.md` with honest Run 1 status;
- `.env.example`;
- `.gitignore`;
- MIT `LICENSE`;
- `docs/METHODOLOGY.md`;
- `docs/execution/RUN_1_REPORT.md`.

The report must contain:

- files created;
- architecture achieved;
- commands run;
- exact test results;
- manual device gate status;
- known risks;
- what Run 2 may safely assume;
- commit SHA.

Run relevant tests once after implementation. Fix failures. Do not spend time on unrelated dependency upgrades.

Commit with:

`feat: establish CutHush two-device physical loop`

Push to `origin main`. Verify the push and final `git status`.

Stop after reporting the Run 1 acceptance gate. Do not begin Run 2.

---

# RUN 2 PROMPT

Paste the entire block below only after Run 1 is complete.

---

You are Run 2 of exactly three execution runs for **CutHush**.

Work in the existing `VoltHacks` repository. Read:

- `CUTHUSH_ANTIGRAVITY_3_RUN_MASTER.md`;
- `README.md`;
- `docs/METHODOLOGY.md`;
- `docs/execution/RUN_1_REPORT.md`;
- current Git history and status.

Do not re-scaffold, replace working architecture, create another branch, or broaden the product.

## Mission

Turn the proven device loop into a physics-guided autonomous governor with earned recovery, same-incident A/B proof, and a real node-local fail-safe.

## Build the detection engine

1. Add three-second baseline calibration.
2. Read the actual audio sample rate.
3. Use linear-power conversions for energy computations.
4. Accept scenario RPM, flute count, nominal harmonics, and instability target.
5. Mark expected rotational/tooth-pass harmonics.
6. Compute:
   - dominant frequency;
   - adaptive peak prominence over baseline;
   - target-band energy ratio;
   - broadband energy;
   - a transparent instability score;
   - persistence across the last six frames.
7. Default to a 4-of-6 persistence rule.
8. Add optional DeviceMotion telemetry as a confidence booster only.
9. Expose thresholds and equations in Methodology.
10. Keep detection deterministic and testable without a microphone.

## Build the state machine

Implement exactly:

`UNPAIRED → READY → CALIBRATING → NOMINAL → SUSPECT → MITIGATING → VERIFYING → RECOVERED | UNRESOLVED | SAFE_HOLD → COMPLETE`

Every transition must store its reason and measured evidence.

## Build automatic mitigation

When instability persists:

1. timestamp detection with `performance.now()`;
2. issue a typed `MITIGATION_COMMAND`;
3. have the phone acknowledge it;
4. ramp down the unstable component smoothly;
5. apply a small deterministic frequency dither representing a bench SSV proxy;
6. collect post-command audio measurements;
7. verify recovery only when target-band energy falls by the configured threshold for the configured duration;
8. otherwise transition to `UNRESOLVED`.

Do not label the command as real G-code. Create a clean adapter interface and an unimplemented/documented future `GrblAdapter` boundary. The shipped adapter is `BenchAudioNodeAdapter`.

## Build the node-local fail-safe

The phone must independently:

- track heartbeat time;
- ramp its output to zero after 1.2 seconds without controller heartbeat while armed;
- enter `SAFE_HOLD`;
- render the event locally;
- report it after reconnection when possible.

The safe hold must not depend on receiving a final server command.

## Build the proof system

1. Run an incident with the governor disabled.
2. Run the identical deterministic incident seed with the governor enabled.
3. Compare:
   - pre/post target-band energy;
   - observed dB change;
   - cumulative instability exposure;
   - detection time;
   - detection-to-command latency;
   - command-to-ack latency;
   - recovery status.
4. Display median and p95 from actual recorded events only.
5. Store run/event/proof metadata in SQLite, with a clearly labeled in-memory fallback.
6. Export canonical JSON Run Capsules.
7. Add a SHA-256 previous-hash chain to the capsule and a verification function.
8. Call it tamper-evident, never immutable.
9. Never replace a failed measurement with a canned success.

## Optional post-run briefing

Implement the provider boundary only if it does not threaten the acceptance gate:

- `FEATHERLESS_API_KEY`, `FEATHERLESS_BASE_URL`, and `FEATHERLESS_MODEL` from environment variables;
- strict structured input and output;
- short timeout;
- deterministic fallback;
- provider/source label;
- no tool-wear, safety-certification, or failure-probability claims.

The app must remain complete without the key.

## Required verification

Add deterministic tests for:

- harmonic exclusion;
- instability scoring;
- 4-of-6 persistence;
- false transient rejection;
- correct state transitions;
- recovery earned above threshold;
- unresolved state below threshold;
- latency computation;
- command acknowledgment;
- heartbeat timeout and safe hold;
- same-seed comparison;
- canonical JSON;
- hash-chain verification;
- tamper detection;
- malformed protocol rejection;
- optional AI timeout/fallback.

Use generated signal fixtures. Label them as simulated. Do not claim synthetic tests prove real machining performance.

## Run 2 acceptance gate

Run 2 passes only if:

1. all backend tests pass;
2. frontend tests, typecheck, and build pass;
3. a deterministic instability moves through the correct state sequence;
4. an isolated transient does not trigger mitigation;
5. governor-enabled mode sends and receives a real WebSocket command;
6. recovery is based on measured energy;
7. a failed recovery becomes `UNRESOLVED`;
8. heartbeat loss causes node-local `SAFE_HOLD`;
9. the same-seed A/B proof is reproducible;
10. Run Capsule verification catches a one-character mutation;
11. no metric is hardcoded as a successful result.

Update:

- `README.md`;
- `docs/METHODOLOGY.md`;
- `docs/execution/RUN_2_REPORT.md`.

The report must include exact tests, measured/demo status, remaining manual gates, risk register, and commit SHA.

Commit with:

`feat: add adaptive chatter governor and measured recovery proof`

Push to `origin main`. Verify push and clean Git status.

Stop after Run 2. Do not begin visual polish, deployment, or submission assets.

---

# RUN 3 PROMPT

Paste the entire block below only after Run 2 is complete.

---

You are Run 3, the final execution and release run for **CutHush**.

Work in the existing `VoltHacks` repository. Read the master file, README, Methodology, Run 1 report, Run 2 report, Git history, and current status. Preserve verified behavior. Do not create a new branch or re-architect the core.

The hard deadline is September 14, 2026 at 2:00 AM PKT. Optimize for a reliable judged release, not feature count.

## Mission

Transform the verified system into a polished, deployable, judge-legible product and complete every repository, demo, and submission artifact.

## Final product experience

Build these routes:

1. `/` — editorial opening and start/replay actions;
2. `/pair/:room` — laptop/phone pairing;
3. `/cell/:room` — live operator Test Cell;
4. `/node/:room` — mobile Bench Machine Node;
5. `/proof/:runId` — same-incident comparison and Run Capsule;
6. `/methodology` — truth boundaries, algorithm, limitations, and future adapter.

Apply the visual system defined in this master:

- warm graphite;
- off-white;
- safety amber;
- signal cyan;
- green only after verified recovery;
- vermilion for unresolved/safe-hold danger;
- restrained typography;
- no cyberpunk;
- no decorative 3D;
- no card-grid dashboard.

Make the Test Cell feel like a precision instrument:

- one dominant state;
- one dominant live spectral view;
- readable target and harmonic markers;
- small event timeline;
- visible node link;
- explicit source badge;
- governor control;
- accessible reduced-motion behavior.

## Judge Mode

Add a **Judge Mode** that guides but never fabricates:

- checks microphone permission;
- checks node pairing;
- starts calibration;
- asks the presenter to begin the bench profile;
- runs the governor-off incident;
- runs the same-seed governor-on incident;
- prompts a heartbeat-loss test;
- opens the proof screen.

Every automated step must still use real events. Replay mode must remain separately labeled.

## Reliability

1. Add reconnection without duplicate room membership.
2. Add bounded WebSocket retry with visible status.
3. Preserve node safe hold during reconnection.
4. Reject stale or cross-room commands.
5. Add a reset that leaves the next run deterministic.
6. Add permission-denied and no-microphone states.
7. Add a working replay path for judges with one device.
8. Ensure mobile layout works on a small Android screen.
9. Prevent accidental scrolling/zoom problems on the armed node screen.
10. Scrub all logs and UI of secrets.

## Deployment

Create:

- multi-stage `Dockerfile`;
- `render.yaml`;
- production static serving from FastAPI;
- `/api/health`;
- correct `wss://` URL resolution behind HTTPS;
- environment-based allowed origins;
- no committed secrets;
- optional Featherless environment variables only.

The project must run:

- locally on Windows;
- locally on Unix-like systems;
- as one Render web service.

Do not require a database service, Firebase, Supabase, or paid API.

## Documentation and submission assets

Create or finalize:

### `README.md`

The first screen of the README must contain:

- CutHush name;
- tagline;
- one-sentence promise;
- a hero screenshot placeholder only until a real screenshot is captured;
- live URL placeholder clearly marked;
- 60-second local run instructions;
- the real/simulated truth statement;
- demo flow;
- architecture;
- measured results populated only from an actual completed run;
- test commands;
- limitations;
- license.

Remove placeholders before the final commit if real values exist. Never invent them.

### `docs/architecture.svg`

Create a clean exact diagram showing:

`Phone bench node → physical sound through air → laptop microphone → browser DSP → governor state machine → WebSocket mitigation → phone response → measured recovery → Run Capsule`

Use the project visual system. Keep labels large enough for Devpost.

### `docs/DEMO_SCRIPT.md`

Use this 3-minute structure:

#### 0:00–0:12 Cold open

Camera shows the phone on a small resonant object such as a metal bowl, tin, or rigid box beside the laptop.

Say:

> This machine is about to become unstable. I am not going to touch it.

Start the instability. CutHush detects it, commands the phone, and the physical tone changes.

#### 0:12–0:30 Problem and promise

Say:

> Machining chatter can ruin a tool or workpiece before a person reacts. CutHush turns ordinary devices into a closed-loop acoustic governor.

Show the one-sentence physical loop.

#### 0:30–0:55 Prove the input is live

- show room pairing;
- show `LIVE_MIC`;
- tap near the microphone and show the spectrum respond;
- show actual sample rate and calibration.

#### 0:55–1:35 Same incident A/B

- run the fixed seed with Governor Off;
- show instability persist;
- reset;
- run the identical seed with Governor On;
- show state transitions;
- hear the phone output change;
- show measured reduction;
- if it does not recover, tune the physical setup and rerun before recording—never fake the metric.

#### 1:35–1:58 Local safety

- stop heartbeats using the dedicated test control;
- show the phone enter `SAFE_HOLD` locally and ramp down;
- explain that the safety behavior does not wait for the controller.

#### 1:58–2:30 Proof

- open Governor Off versus Governor On;
- show the same incident ID;
- show actual dB change and observed latency;
- show source labels;
- verify the exported Run Capsule.

#### 2:30–2:48 Architecture and boundary

Say:

> This release proves the sensing and control loop on commodity hardware. A production adapter would map the same bounded command interface to a reviewed machine controller.

#### 2:48–3:00 Close

Say:

> Most monitoring systems tell you a machine failed. CutHush makes the machine hear itself—and proves whether the response worked.

End on the recovered Test Cell and product name.

### `docs/DEVPOST_SUBMISSION.md`

Prepare human, confident, copy-ready sections:

- Inspiration;
- What it does;
- How we built it;
- Challenges;
- Accomplishments;
- What we learned;
- What is next;
- Technologies;
- exact truth boundary;
- repository URL;
- live URL placeholder;
- video URL placeholder.

Do not use AI-slop phrases such as “revolutionary,” “game-changing,” or “leveraging cutting-edge technology.”

### `docs/COMPETITIVE_CHECK.md`

Record the collision analysis from this master. Make clear that similar research projects validate the problem and that CutHush’s contribution is its browser-based two-device loop, automatic physical response, measured same-seed comparison, and local watchdog.

### `docs/FINAL_RELEASE_CHECKLIST.md`

Include:

- build;
- tests;
- microphone permission;
- phone pairing;
- live source labels;
- A/B run;
- safe hold;
- proof export;
- mobile layout;
- deployment;
- repository public access;
- README;
- screenshot;
- architecture image;
- demo video;
- Devpost fields;
- team members;
- license;
- secret scan.

## Final verification

Run only the relevant release suite:

- backend tests;
- frontend tests;
- typecheck;
- production build;
- WebSocket integration tests;
- one end-to-end smoke journey;
- Docker build if Docker is available;
- release verification script;
- secret-pattern scan;
- broken-link/local-reference check.

Do not repeatedly rerun expensive suites without a code change.

Perform the two-device manual acceptance where possible. Save the real observed measurements to a Run Capsule and use those values in README and submission copy. If the environment cannot access the phone, leave a precise `MANUAL GATE` and do not fabricate success.

## Final GitHub state

Remove:

- temporary prompts other than this master file;
- debug dumps;
- unused boilerplate;
- generated secrets;
- duplicate docs;
- stale placeholders that can be resolved;
- misleading claims.

Do not remove this master file, source fixtures, reports, tests, or evidence needed to reproduce the release.

Create `docs/execution/RUN_3_REPORT.md` containing:

- final architecture;
- exact test outcomes;
- manual test outcomes;
- live URL;
- measured results;
- remaining limitations;
- submission readiness;
- commit SHA;
- final `git status`.

Commit with:

`feat: ship CutHush verified VoltHacks release`

Push to `origin main`. Verify the remote commit and that the worktree is clean.

Stop after the release report. Do not submit to Devpost automatically and do not invent YouTube or deployment URLs.

---

# MANUAL DEMO KIT

Gather these while Run 1 executes:

- Android phone with Chrome;
- laptop with Chrome and a working microphone;
- same Wi-Fi network or internet access;
- small metal bowl, tin, rigid plastic container, or empty cardboard box to make the phone’s physical sound visible and audible;
- simple clean phone stand or tape;
- earphones nearby in case feedback becomes uncomfortable;
- screen recorder;
- quiet room for the final take.

Do not place the phone on a machine, spinning tool, fan, or unsafe surface.

## Accounts and keys

Required:

- GitHub repository already created;
- Render account only for final deployment.

Optional:

- Featherless API key.

The core project must not require any paid key.

---

# HARD DEADLINE RULES

1. Freeze new features after Run 2.
2. If two-device audio works, protect it from rewrites.
3. If DeviceMotion is unreliable, keep it optional and continue.
4. If Featherless is slow or unavailable, use the labeled deterministic briefing.
5. If Render deployment takes too long, preserve a working local demo and repository first.
6. Record the live physical loop before experimenting with secondary polish.
7. Upload the demo video early enough to survive one failed upload.
8. Keep at least 90 minutes for Devpost media, fields, links, and final verification.

---

# FINAL JUDGE TEST

Before recording, ask:

- Can a stranger understand the problem in ten seconds?
- Can they see and hear the physical system respond?
- Does the same incident behave differently only because the governor is enabled?
- Are the measurements produced by this run?
- Is every simulated or fallback element labeled?
- Does safe hold occur locally when the controller disappears?
- Does the product remain useful without an LLM?
- Can the judge repeat the project in one sentence?

The desired answer is:

> CutHush lets an ordinary laptop hear a machine-like instability, command a separate physical node to change, and prove from live measurements whether the intervention worked.

