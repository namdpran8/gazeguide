import logging

from fastapi import APIRouter, HTTPException


from app.schemas import (
    ExplainRequest,
    ExplainResponse,
    HealthResponse,
    LessonSummary,
    SceneResponse,
)
from app.services.lessons import (
    LessonNotFoundError,
    ObjectNotFoundError,
    SceneNotFoundError,
    get_scene,
    get_selected_object,
    list_lessons,
)
from app.services.bedrock import explain_with_bedrock


logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok")


@router.get(
    "/api/v1/lessons",
    response_model=list[LessonSummary],
)
def lessons():
    return list_lessons()


@router.get(
    "/api/v1/lessons/{lesson_id}/scenes/{scene_id}",
    response_model=SceneResponse,
)
def scene_details(lesson_id: str, scene_id: str):
    try:
        lesson, scene = get_scene(lesson_id, scene_id)
    except LessonNotFoundError:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "LESSON_NOT_FOUND",
                "message": "The requested lesson was not found.",
                "fallback": True,
            },
        )
    except SceneNotFoundError:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "SCENE_NOT_FOUND",
                "message": "The requested scene was not found.",
                "fallback": True,
            },
        )

    return SceneResponse(
        lesson_id=lesson["lesson_id"],
        scene_id=scene["scene_id"],
        lesson_title=lesson["title"],
        scene_title=scene["title"],
        description=scene["description"],
        timestamp_seconds=scene["timestamp_seconds"],
        objects=scene["objects"],
    )


@router.post(
    "/api/v1/explain",
    response_model=ExplainResponse,
)
def explain(request: ExplainRequest):
    try:
        lesson, scene, obj = get_selected_object(
            request.lesson_id,
            request.scene_id,
            request.selected_object_id,
        )
    except LessonNotFoundError:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "LESSON_NOT_FOUND",
                "message": "The requested lesson was not found.",
                "fallback": True,
            },
        )
    except SceneNotFoundError:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "SCENE_NOT_FOUND",
                "message": "The requested scene was not found.",
                "fallback": True,
            },
        )
    except ObjectNotFoundError:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "OBJECT_NOT_FOUND",
                "message": "The selected object was not found.",
                "fallback": True,
            },
        )

    result = explain_with_bedrock(
        lesson_title=lesson["title"],
        scene_description=scene["description"],
        label=obj["label"],
        object_description=obj["description"],
        question=request.question,
    )

    logger.info(
        "Explanation request completed: lesson=%s scene=%s "
        "object=%s fallback=%s",
        request.lesson_id,
        request.scene_id,
        request.selected_object_id,
        result.fallback,
    )

    return result
