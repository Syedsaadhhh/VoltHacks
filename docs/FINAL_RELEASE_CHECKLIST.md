# Final release checklist

## Automated

- [ ] GitHub backend tests pass within two minutes.
- [ ] Frontend TypeScript and Vite production build pass within four minutes.
- [ ] Production health endpoint returns protocol 1.0.0.
- [ ] SPA routes load directly: `/`, `/cell/...`, `/node/...`, `/proof/...`, `/methodology`.

## Two-device gate

- [ ] Laptop microphone meter reacts to a tap or voice.
- [ ] Phone QR uses a LAN/HTTPS origin, never localhost.
- [ ] Nominal and instability profiles are audible at moderate volume.
- [ ] Laptop sees the 2.4 kHz target rise and advances persistence.
- [ ] Automatic mitigation produces a matching command ACK.
- [ ] Closing the laptop causes phone SAFE_HOLD within 1.2 seconds.

## Judge proof

- [ ] Same-seed proof completes in replay mode.
- [ ] RECOVERED appears only after sustained ≥6 dB reduction.
- [ ] `/proof/latest` shows the result and `SHA-256 VERIFIED`.
- [ ] Run Capsule downloads as JSON.

## Submission assets

- [ ] Public deployment URL works in a private/incognito window.
- [ ] 90-second video clearly shows both devices and the truth boundary.
- [ ] Thumbnail uses the RECOVERED proof surface, not a generic landing page.
- [ ] Devpost description, technologies, GitHub URL, and demo URL are complete.
