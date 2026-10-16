
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ExplainRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lesson_id: str = Field(min_length=1, max_length=100)
    scene_id: str = Field(min_length=1, max_length=100)
    selected_object_id: str = Field(min_length=1, max_length=100)
    question: str = Field(
        default="Explain this object.",
        min_length=1,
        max_length=500,
    )


class ExplainResponse(BaseModel):
    title: str
    explanation: str
    analogy: str
    follow_up: list[str] = Field(min_length=1, max_length=3)
    source_note: str
    fallback: bool


class SelectedObject(BaseModel):
    id: str
    label: str
    description: str
    region: tuple[float, float, float, float]


class SceneResponse(BaseModel):
    lesson_id: str
    scene_id: str
    lesson_title: str
    scene_title: str
    description: str
    timestamp_seconds: float
    objects: list[SelectedObject]


class LessonSummary(BaseModel):
    lesson_id: str
    title: str
    description: str


class ErrorResponse(BaseModel):
    error_code: str
    message: str
    fallback: bool = True


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
