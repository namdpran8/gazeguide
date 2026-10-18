import json

import pytest

from app.services.annotations import AnnotationValidationError, load_annotation_document, validate_annotation_document, validate_bbox


def test_review_dataset_is_valid_and_has_only_object_classes():
    document = load_annotation_document("../assets/annotations/gazeguide-review.json")
    assert len(document["frames"]) == 5
    assert {annotation["class"] for frame in document["frames"] for annotation in frame["annotations"]} <= {"sun", "earth"}


@pytest.mark.parametrize("bbox", [[0, 0, 1, 1], [0.1, 0.2, 0.3, 0.4]])
def test_bbox_accepts_valid_normalized_xyxy(bbox):
    validate_bbox(bbox)


@pytest.mark.parametrize("bbox", [[0, 0, 0, 1], [0, 0, 1.1, 1], [0, 0, 1], [0, 0, float("nan"), 1]])
def test_bbox_rejects_invalid_coordinates(bbox):
    with pytest.raises(AnnotationValidationError):
        validate_bbox(bbox)


def test_annotation_document_rejects_orbital_path_class():
    document = {"schema_version": 1, "frames": [{"frame_id": "x", "file_name": "x.jpg", "timestamp_seconds": 0, "review_status": "pending", "annotations": [{"annotation_id": "a", "class": "earth-orbit", "bbox": [0, 0, 1, 1]}]}]}
    with pytest.raises(AnnotationValidationError, match="individual planet"):
        validate_annotation_document(document)


def test_approved_frame_requires_named_human_reviewer():
    document = {"schema_version": 1, "frames": [{"frame_id": "x", "file_name": "x.jpg", "timestamp_seconds": 0, "review_status": "approved", "annotations": []}]}
    with pytest.raises(AnnotationValidationError, match="reviewed_by"):
        validate_annotation_document(document)
