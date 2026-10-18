from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

OBJECT_CLASSES = (
    "sun",
    "mercury",
    "venus",
    "earth",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
)


class AnnotationValidationError(ValueError):
    """Raised when a review annotation violates the dataset contract."""


def validate_bbox(bbox: object) -> None:
    if not isinstance(bbox, list) or len(bbox) != 4:
        raise AnnotationValidationError("bbox must be a list of four coordinates")
    if not all(isinstance(value, (int, float)) and math.isfinite(value) for value in bbox):
        raise AnnotationValidationError("bbox coordinates must be finite numbers")
    x_min, y_min, x_max, y_max = bbox
    if not all(0.0 <= value <= 1.0 for value in bbox):
        raise AnnotationValidationError("bbox coordinates must be normalized to [0, 1]")
    if x_min >= x_max or y_min >= y_max:
        raise AnnotationValidationError("bbox must have positive width and height")


def validate_annotation_document(document: object) -> None:
    if not isinstance(document, dict) or document.get("schema_version") != 1:
        raise AnnotationValidationError("schema_version must equal 1")
    frames = document.get("frames")
    if not isinstance(frames, list) or not frames:
        raise AnnotationValidationError("frames must be a non-empty list")
    seen_frame_ids: set[str] = set()
    for frame in frames:
        if not isinstance(frame, dict):
            raise AnnotationValidationError("each frame must be an object")
        frame_id = frame.get("frame_id")
        if not isinstance(frame_id, str) or not frame_id or frame_id in seen_frame_ids:
            raise AnnotationValidationError("frame_id must be a unique, non-empty string")
        seen_frame_ids.add(frame_id)
        if not isinstance(frame.get("file_name"), str) or not frame["file_name"]:
            raise AnnotationValidationError("frame file_name must be a non-empty string")
        if not isinstance(frame.get("timestamp_seconds"), (int, float)) or frame["timestamp_seconds"] < 0:
            raise AnnotationValidationError("frame timestamp_seconds must be non-negative")
        if frame.get("review_status") not in {"pending", "approved", "needs_changes", "rejected"}:
            raise AnnotationValidationError("review_status must be pending, approved, needs_changes, or rejected")
        if frame.get("review_status") == "approved" and (
            not isinstance(frame.get("reviewed_by"), str) or not frame["reviewed_by"].strip()
        ):
            raise AnnotationValidationError("approved frames must record reviewed_by")
        annotations = frame.get("annotations")
        if not isinstance(annotations, list):
            raise AnnotationValidationError("frame annotations must be a list")
        seen_annotation_ids: set[str] = set()
        for annotation in annotations:
            if not isinstance(annotation, dict):
                raise AnnotationValidationError("each annotation must be an object")
            annotation_id = annotation.get("annotation_id")
            if not isinstance(annotation_id, str) or not annotation_id or annotation_id in seen_annotation_ids:
                raise AnnotationValidationError("annotation_id must be unique within a frame")
            seen_annotation_ids.add(annotation_id)
            if annotation.get("class") not in OBJECT_CLASSES:
                raise AnnotationValidationError("annotation class must be Sun or an individual planet")
            validate_bbox(annotation.get("bbox"))


def load_annotation_document(path: str | Path) -> dict[str, Any]:
    with Path(path).open(encoding="utf-8") as handle:
        document = json.load(handle)
    validate_annotation_document(document)
    return document
