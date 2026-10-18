import json
from pathlib import Path
import cv2
import numpy as np
from app.services.annotations import validate_annotation_document
from scripts.prepare_cv_dataset import build_dataset


def _approved(frame_id, file_name, timestamp, klass):
    return {"frame_id": frame_id, "file_name": file_name, "timestamp_seconds": timestamp, "review_status": "approved", "reviewed_by": "reviewer", "annotations": [{"annotation_id": frame_id + "-a", "class": klass, "bbox": [0.1, 0.1, 0.2, 0.2]}]}


def test_dataset_builder_excludes_non_approved_and_uses_time_splits(tmp_path):
    images = tmp_path / "images"; images.mkdir()
    for name, shade in (("a.jpg", 10), ("b.jpg", 120), ("c.jpg", 240)):
        assert cv2.imwrite(str(images / name), np.full((20, 20, 3), shade, dtype=np.uint8))
    document = {"schema_version": 1, "frames": [_approved("a", "a.jpg", 0.0, "sun"), _approved("b", "b.jpg", 7.5, "earth"), _approved("c", "c.jpg", 10.0, "sun"), {"frame_id": "pending", "file_name": "a.jpg", "timestamp_seconds": 5.0, "review_status": "pending", "annotations": []}]}
    validate_annotation_document(document)
    report = build_dataset(document, images, tmp_path / "dataset")
    assert report["approved_frames"] == 3
    assert report["excluded"] == {"pending": 1}
    assert report["splits"]["train"]["frames"] == 1
    assert report["splits"]["val"]["frames"] == 1
    assert report["splits"]["test"]["frames"] == 1
    assert (tmp_path / "dataset" / "train" / "images" / "a.jpg").exists()


def test_dataset_builder_reports_near_duplicates_across_splits(tmp_path):
    images = tmp_path / "images"; images.mkdir()
    image = np.full((20, 20, 3), 50, dtype=np.uint8)
    assert cv2.imwrite(str(images / "a.jpg"), image)
    assert cv2.imwrite(str(images / "b.jpg"), image)
    document = {"schema_version": 1, "frames": [_approved("a", "a.jpg", 0.0, "sun"), _approved("b", "b.jpg", 10.0, "sun")]}
    validate_annotation_document(document)
    report = build_dataset(document, images, tmp_path / "dataset")
    assert len(report["cross_split_near_duplicates"]) == 1
