# Devpost submission draft

## Project name

CutHush

## Tagline

A browser-native acoustic governor that hears instability, acts, and proves recovery.

## Inspiration

Operators often recognize machine trouble by sound, but human attention is intermittent and conventional monitoring demos often stop at a dashboard. We wanted to show the missing loop: detect a persistent acoustic change, issue a bounded response, and measure whether the response worked.

## What it does

CutHush pairs a laptop with a phone acting as a clearly labeled bench machine node. The phone emits a deterministic nominal machine proxy and a seeded 2.4 kHz instability. The laptop listens through its real microphone, compares target-band energy with a fresh local baseline and neighbouring bands, requires four positive frames in a six-frame window, and automatically sends a mitigation command. It then verifies sustained reduction. If the evidence is insufficient, the run says UNRESOLVED instead of turning green.

Judge Mode runs the identical seeded incident with the governor OFF and ON. It produces a persisted, exportable, SHA-256 hash-chained proof capsule and a shareable proof page.

## How we built it

- React, TypeScript, Vite, Web Audio API, Canvas FFT visualization
- FastAPI, Pydantic protocol validation, WebSockets, SQLite proof storage
- deterministic Mulberry32 replay and browser audio synthesis
- Docker, Render Blueprint, GitHub Actions

## Challenges

Mobile autoplay rules required an explicit arm gesture. A real two-browser loop also needed operator-bound heartbeats, independent node SAFE_HOLD, LAN-safe QR pairing, reconnection limits, and duplicate/stale command rejection. We designed the verdict boundary so visual success is downstream of measured recovery, never a timer.

## Accomplishments

- real speaker-to-air-to-microphone control path using ordinary devices;
- deterministic same-seed counterfactual proof;
- honest RECOVERED versus UNRESOLVED verdict;
- tamper-evident evidence chain;
- a 1.2-second independent node fail-safe.

## What we learned

The most persuasive control demo is not the detector alone; it is a visibly bounded sequence from sensing through actuation to post-action verification. Clear labels for live, simulated, and unvalidated behavior make the prototype more credible, not less.

## What’s next

Replace the bench audio proxy with isolated industrial sensors and an advisory-only PLC integration, then validate thresholds across machine types and operating regimes before granting any production authority.

## Links to fill

- Demo: `[PUBLIC_DEPLOYMENT_URL]`
- Source: https://github.com/Syedsaadhhh/VoltHacks
- Video: `[VIDEO_URL]`
