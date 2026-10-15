
from fastapi.testclient import TestClient

from app.main import app
from app.routes import api
from app.schemas import ExplainResponse


client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_list_lessons():
    response = client.get("/api/v1/lessons")

    assert response.status_code == 200
    assert response.json()[0]["lesson_id"] == "solar-system-01"


def test_get_scene():
    response = client.get(
        "/api/v1/lessons/solar-system-01/"
        "scenes/orbit-scene-02"
    )

    assert response.status_code == 200
    assert response.json()["scene_id"] == "orbit-scene-02"
    assert len(response.json()["objects"]) >= 1


def test_unknown_object():
    response = client.post(
        "/api/v1/explain",
        json={
            "lesson_id": "solar-system-01",
            "scene_id": "orbit-scene-02",
            "selected_object_id": "unknown-object",
            "question": "Explain this.",
        },
    )

    assert response.status_code == 404


def test_explanation_endpoint(monkeypatch):
    def fake_explanation(**kwargs):
        return ExplainResponse(
            title="Earth's orbit",
            explanation="Gravity changes Earth's direction as it moves.",
            analogy="Imagine a ball moving around a curved track.",
            follow_up=["What is gravity?"],
            source_note="Test response.",
            fallback=False,
        )

    monkeypatch.setattr(
        api,
        "explain_with_bedrock",
        fake_explanation,
    )

    response = client.post(
        "/api/v1/explain",
        json={
            "lesson_id": "solar-system-01",
            "scene_id": "orbit-scene-02",
            "selected_object_id": "earth-orbit",
            "question": "Why does Earth orbit the Sun?",
        },
    )

    assert response.status_code == 200
    assert response.json()["fallback"] is False
    assert len(response.json()["follow_up"]) >= 1
