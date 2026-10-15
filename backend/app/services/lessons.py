
import json
from pathlib import Path
from typing import Any


MANIFEST_PATH = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "lesson-manifest.json"
)


class LessonNotFoundError(Exception):
    pass


class SceneNotFoundError(Exception):
    pass


class ObjectNotFoundError(Exception):
    pass


def load_manifest() -> dict[str, Any]:
    with MANIFEST_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def list_lessons() -> list[dict[str, str]]:
    manifest = load_manifest()

    return [
        {
            "lesson_id": lesson["lesson_id"],
            "title": lesson["title"],
            "description": lesson["description"],
        }
        for lesson in manifest["lessons"]
    ]


def get_lesson(lesson_id: str) -> dict[str, Any]:
    for lesson in load_manifest()["lessons"]:
        if lesson["lesson_id"] == lesson_id:
            return lesson

    raise LessonNotFoundError(lesson_id)


def get_scene(
    lesson_id: str,
    scene_id: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    lesson = get_lesson(lesson_id)

    for scene in lesson["scenes"]:
        if scene["scene_id"] == scene_id:
            return lesson, scene

    raise SceneNotFoundError(scene_id)


def get_selected_object(
    lesson_id: str,
    scene_id: str,
    object_id: str,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    lesson, scene = get_scene(lesson_id, scene_id)

    for obj in scene["objects"]:
        if obj["id"] == object_id:
            return lesson, scene, obj

    raise ObjectNotFoundError(object_id)
