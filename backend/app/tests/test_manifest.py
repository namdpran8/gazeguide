import json
import math
from pathlib import Path
import pytest

from app.schemas import SceneResponse, SelectedObject
from app.services.lessons import (
    LessonNotFoundError,
    ObjectNotFoundError,
    SceneNotFoundError,
    get_lesson,
    get_scene,
    get_selected_object,
    list_lessons,
    load_manifest,
)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_BACKEND_MANIFEST = _PROJECT_ROOT / "backend" / "data" / "lesson-manifest.json"
_ASSETS_MANIFEST = _PROJECT_ROOT / "assets" / "lesson-manifest.json"


class TestManifestStructureAndSchema:
    def test_manifest_file_exists(self):
        assert _BACKEND_MANIFEST.exists(), f"Manifest not found at {_BACKEND_MANIFEST}"

    def test_manifest_parses_valid_json(self):
        data = load_manifest()
        assert isinstance(data, dict), "Manifest root must be a JSON object"
        assert "lessons" in data, "Manifest must contain a 'lessons' key"
        assert len(data["lessons"]) >= 1, "Manifest must contain at least one lesson"

    def test_lessons_required_fields(self):
        manifest = load_manifest()
        for lesson in manifest["lessons"]:
            assert isinstance(lesson.get("lesson_id"), str) and lesson["lesson_id"].strip()
            assert isinstance(lesson.get("title"), str) and lesson["title"].strip()
            assert isinstance(lesson.get("description"), str) and lesson["description"].strip()
            assert isinstance(lesson.get("asset"), str) and lesson["asset"].strip()
            assert isinstance(lesson.get("scenes"), list) and len(lesson["scenes"]) >= 1

    def test_scenes_required_fields_and_types(self):
        manifest = load_manifest()
        for lesson in manifest["lessons"]:
            for scene in lesson["scenes"]:
                assert isinstance(scene.get("scene_id"), str) and scene["scene_id"].strip()
                assert isinstance(scene.get("title"), str) and scene["title"].strip()
                assert isinstance(scene.get("description"), str) and scene["description"].strip()
                assert isinstance(scene.get("timestamp_seconds"), (int, float))
                assert scene["timestamp_seconds"] >= 0.0
                assert isinstance(scene.get("objects"), list)
                assert len(scene["objects"]) >= 1, f"Scene {scene['scene_id']} must have at least one object"

    def test_scene_ids_unique_within_lesson(self):
        manifest = load_manifest()
        for lesson in manifest["lessons"]:
            scene_ids = [s["scene_id"] for s in lesson["scenes"]]
            assert len(scene_ids) == len(set(scene_ids)), f"Duplicate scene IDs in lesson {lesson['lesson_id']}"

    def test_object_ids_unique_within_scene(self):
        manifest = load_manifest()
        for lesson in manifest["lessons"]:
            for scene in lesson["scenes"]:
                obj_ids = [o["id"] for o in scene["objects"]]
                assert len(obj_ids) == len(set(obj_ids)), f"Duplicate object IDs in scene {scene['scene_id']}"

    def test_bounding_boxes_format_and_bounds(self):
        manifest = load_manifest()
        for lesson in manifest["lessons"]:
            for scene in lesson["scenes"]:
                for obj in scene["objects"]:
                    region = obj.get("region")
                    assert isinstance(region, list), f"region in {obj['id']} must be a list"
                    assert len(region) == 4, f"region in {obj['id']} must have exactly 4 values"
                    for coord in region:
                        assert isinstance(coord, (int, float)), f"Coord {coord} must be numeric"
                        assert math.isfinite(coord), f"Coord {coord} must be finite"
                        assert 0.0 <= coord <= 1.0, f"Coord {coord} in {obj['id']} must be between 0.0 and 1.0"
                    x1, y1, x2, y2 = region
                    assert x1 < x2, f"x1 ({x1}) must be < x2 ({x2}) for {obj['id']} in scene {scene['scene_id']}"
                    assert y1 < y2, f"y1 ({y1}) must be < y2 ({y2}) for {obj['id']} in scene {scene['scene_id']}"

    def test_referenced_asset_exists(self):
        manifest = load_manifest()
        for lesson in manifest["lessons"]:
            asset_path = _PROJECT_ROOT / lesson["asset"]
            assert asset_path.exists(), f"Asset {asset_path} referenced by lesson {lesson['lesson_id']} does not exist"

    def test_backend_and_assets_manifest_synchronized(self):
        assert _ASSETS_MANIFEST.exists()
        assert _BACKEND_MANIFEST.exists()
        backend_content = json.loads(_BACKEND_MANIFEST.read_text(encoding="utf-8"))
        assets_content = json.loads(_ASSETS_MANIFEST.read_text(encoding="utf-8"))
        assert backend_content == assets_content, "assets/lesson-manifest.json must match backend/data/lesson-manifest.json"


class TestLessonServiceIntegration:
    def test_list_lessons_contains_solar_system(self):
        lessons = list_lessons()
        assert len(lessons) >= 1
        lesson_ids = [l["lesson_id"] for l in lessons]
        assert "solar-system-01" in lesson_ids

    def test_get_lesson_success(self):
        lesson = get_lesson("solar-system-01")
        assert lesson["lesson_id"] == "solar-system-01"
        assert len(lesson["scenes"]) == 3

    def test_get_lesson_not_found_raises(self):
        with pytest.raises(LessonNotFoundError):
            get_lesson("nonexistent-lesson")

    @pytest.mark.parametrize("scene_id", ["orbit-scene-01", "orbit-scene-02", "orbit-scene-03"])
    def test_get_scene_for_all_scenes(self, scene_id):
        lesson, scene = get_scene("solar-system-01", scene_id)
        assert lesson["lesson_id"] == "solar-system-01"
        assert scene["scene_id"] == scene_id
        assert len(scene["objects"]) >= 3

    def test_get_scene_not_found_raises(self):
        with pytest.raises(SceneNotFoundError):
            get_scene("solar-system-01", "nonexistent-scene")

    def test_preserved_scene_02_earth_orbit_resolves(self):
        lesson, scene, obj = get_selected_object("solar-system-01", "orbit-scene-02", "earth-orbit")
        assert lesson["lesson_id"] == "solar-system-01"
        assert scene["scene_id"] == "orbit-scene-02"
        assert obj["id"] == "earth-orbit"
        assert obj["label"] == "Earth's orbit"

    def test_get_all_annotated_objects_resolve(self):
        manifest = load_manifest()
        for lesson in manifest["lessons"]:
            lesson_id = lesson["lesson_id"]
            for scene in lesson["scenes"]:
                scene_id = scene["scene_id"]
                for obj in scene["objects"]:
                    obj_id = obj["id"]
                    l, s, o = get_selected_object(lesson_id, scene_id, obj_id)
                    assert l["lesson_id"] == lesson_id
                    assert s["scene_id"] == scene_id
                    assert o["id"] == obj_id

    def test_get_selected_object_not_found_raises(self):
        with pytest.raises(ObjectNotFoundError):
            get_selected_object("solar-system-01", "orbit-scene-02", "nonexistent-object")

    def test_pydantic_scene_response_compatibility(self):
        manifest = load_manifest()
        for lesson in manifest["lessons"]:
            for scene in lesson["scenes"]:
                response = SceneResponse(
                    lesson_id=lesson["lesson_id"],
                    scene_id=scene["scene_id"],
                    lesson_title=lesson["title"],
                    scene_title=scene["title"],
                    description=scene["description"],
                    timestamp_seconds=scene["timestamp_seconds"],
                    objects=scene["objects"],
                )
                assert response.scene_id == scene["scene_id"]
                assert len(response.objects) == len(scene["objects"])