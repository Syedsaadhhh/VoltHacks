import json
import os
import sqlite3
import threading
from pathlib import Path
from typing import Any, Optional


class ProofStore:
    """Tiny durable store for judge-visible run capsules."""

    def __init__(self, path: Optional[str] = None):
        configured = path or os.getenv("CUTHUSH_DB_PATH", "/tmp/cuthush-proofs.sqlite3")
        self.path = Path(configured)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=2)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self):
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS proofs (
                    run_id TEXT PRIMARY KEY,
                    room_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    outcome TEXT NOT NULL,
                    digest TEXT NOT NULL,
                    previous_digest TEXT,
                    payload_json TEXT NOT NULL
                )
                """
            )

    def save(self, payload: dict[str, Any]) -> dict[str, Any]:
        encoded = json.dumps(payload, separators=(",", ":"), sort_keys=True)
        with self._lock, self._connect() as connection:
            connection.execute(
                """
                INSERT INTO proofs (
                    run_id, room_id, created_at, outcome, digest,
                    previous_digest, payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(run_id) DO UPDATE SET
                    outcome=excluded.outcome,
                    digest=excluded.digest,
                    previous_digest=excluded.previous_digest,
                    payload_json=excluded.payload_json
                """,
                (
                    payload["run_id"],
                    payload["room_id"],
                    payload["created_at"],
                    payload["outcome"],
                    payload["digest"],
                    payload.get("previous_digest"),
                    encoded,
                ),
            )
        return payload

    def get(self, run_id: str) -> Optional[dict[str, Any]]:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload_json FROM proofs WHERE run_id = ?", (run_id,)
            ).fetchone()
        return json.loads(row["payload_json"]) if row else None


proof_store = ProofStore()
