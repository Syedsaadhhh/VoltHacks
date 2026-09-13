# CutHush 90-second judge demo

## Before recording

- Open the laptop test cell and the phone node on the same network.
- Grant laptop microphone access and arm the phone with a touch.
- Keep laptop and phone roughly 0.5–1 metre apart at moderate volume.
- Keep `/proof/latest` available in a second tab.

## Script

**0–12 seconds — Hook**  
“A machine should not wait for a person to hear it failing. CutHush closes a real loop using only two browsers.” Show the laptop and phone in one frame.

**12–30 seconds — Establish reality**  
Point to `LIVE_MIC`, the granted sample rate, the moving liveness meter, the phone’s `BENCH MACHINE NODE` label, and the paired room code. Say explicitly that the phone is a proxy, not a CNC machine.

**30–52 seconds — Physical loop**  
Start nominal sound on the phone, inject the 2.4 kHz instability, and show the spectrum, baseline delta, prominence, and 4-of-6 persistence advancing. Let automatic mitigation fire; show the command ACK.

**52–65 seconds — Safety**  
Briefly explain that stale and duplicate commands are rejected and that the phone independently ramps silent if controller heartbeats disappear for 1.2 seconds.

**65–84 seconds — Judge Mode**  
Press **Run same-seed proof**. Say: “The identical incident runs with the governor off and on. Green is earned only after sustained measured reduction.” Show OFF exposure, ON outcome, and reduction.

**84–90 seconds — Proof**  
Open the proof route. Show `SHA-256 VERIFIED`, then finish: “Same incident. Different outcome. Evidence, not animation.”

## Recording fallback

If room acoustics are unreliable, use Judge Mode. Keep `REPLAY_FIXTURE` visible and describe it as deterministic reproducibility—not a live microphone claim.
