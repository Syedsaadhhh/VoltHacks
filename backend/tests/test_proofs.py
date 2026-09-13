import hashlib
import json
from pathlib import Path

from backend.app.proof_store import ProofStore


def test_proof_store_round_trip(tmp_path: Path):
    payload = {
        "run_id": "run-test-001",
        "room_id": "HUSH-123",
        "created_at": "2026-09-13T10:00:00.000Z",
        "source": "REPLAY_FIXTURE",
        "seed": 2026,
        "outcome": "RECOVERED",
        "off_exposure_ms": 1600,
        "on_exposure_ms": 980,
        "reduction_db": 8.4,
        "previous_digest": None,
    }
    canonical = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    payload["digest"] = hashlib.sha256(canonical.encode()).hexdigest()

    store = ProofStore(str(tmp_path / "proofs.sqlite3"))
    assert store.save(payload) == payload
    assert store.get("run-test-001") == payload
    assert store.get("missing") is None
