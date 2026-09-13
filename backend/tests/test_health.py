import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0"
    assert data["protocol_version"] == "1.0.0"
    assert "active_rooms" in data
    assert "timestamp" in data

def test_create_and_get_room():
    create_res = client.post("/api/rooms")
    assert create_res.status_code == 200
    room_data = create_res.json()
    room_id = room_data["room_id"]
    assert room_id.startswith("HUSH-")

    get_res = client.get(f"/api/rooms/{room_id}")
    assert get_res.status_code == 200
    assert get_res.json()["room_id"] == room_id
    assert get_res.json()["is_paired"] is False