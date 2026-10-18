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


def test_get_all_three_scenes():
    for scene_id in ["orbit-scene-01", "orbit-scene-02", "orbit-scene-03"]:
        response = client.get(f"/api/v1/lessons/solar-system-01/scenes/{scene_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["scene_id"] == scene_id
        assert data["lesson_id"] == "solar-system-01"
        assert len(data["objects"]) == 4
        for obj in data["objects"]:
            assert obj["id"]
            assert obj["label"]
            assert len(obj["region"]) == 4


def test_get_scene_unknown_lesson():
    response = client.get("/api/v1/lessons/unknown-lesson/scenes/orbit-scene-01")
    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == "LESSON_NOT_FOUND"


def test_get_scene_unknown_scene():
    response = client.get("/api/v1/lessons/solar-system-01/scenes/unknown-scene")
    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == "SCENE_NOT_FOUND"


def test_explain_across_all_scenes():
    test_objects = [
        ("orbit-scene-01", "sun"),
        ("orbit-scene-02", "earth-orbit"),
        ("orbit-scene-02", "earth"),
        ("orbit-scene-03", "outer-body"),
    ]
    for scene_id, object_id in test_objects:
        response = client.post(
            "/api/v1/explain",
            json={
                "lesson_id": "solar-system-01",
                "scene_id": scene_id,
                "selected_object_id": object_id,
                "question": f"Tell me about {object_id}.",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "title" in data and data["title"]
        assert "explanation" in data and data["explanation"]
        assert "analogy" in data and data["analogy"]
        assert "follow_up" in data and len(data["follow_up"]) >= 1
        assert "source_note" in data and data["source_note"]
        assert "fallback" in data


def test_explain_validation_error():
    response = client.post(
        "/api/v1/explain",
        json={"lesson_id": "solar-system-01"},
    )
    assert response.status_code == 422
    assert response.json()["error_code"] == "INVALID_REQUEST"
