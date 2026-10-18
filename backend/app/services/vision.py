from __future__ import annotations

import logging
from pathlib import Path
from typing import Union

import cv2
import numpy as np

logger = logging.getLogger(__name__)


def extract_frame(
    video_path: Union[str, Path],
    timestamp_seconds: float,
) -> np.ndarray:

    if timestamp_seconds < 0:
        raise ValueError(
            f"timestamp_seconds must be >= 0, got {timestamp_seconds!r}."
        )

    video_path = str(video_path)

    cap = cv2.VideoCapture(video_path)

    try:
        if not cap.isOpened():
            raise OSError(
                f"Cannot open video file: {video_path!r}.  "
                "Check that the file exists, is a supported video format, "
                "and that OpenCV was built with the required codec."
            )

        target_ms = timestamp_seconds * 1000.0
        seek_ok = cap.set(cv2.CAP_PROP_POS_MSEC, target_ms)

        if not seek_ok:
            logger.warning(
                "Seek to %.3f s (%.0f ms) was not confirmed by OpenCV for %r.  "
                "The returned frame may be from a different position.",
                timestamp_seconds,
                target_ms,
                video_path,
            )

        success, frame = cap.read()

        if not success or frame is None:
            raise RuntimeError(
                f"No frame could be decoded from {video_path!r} "
                f"at timestamp {timestamp_seconds:.3f} s.  "
                "The timestamp may be past the end of the video, or the "
                "file may be corrupted."
            )

        logger.info(
            "Extracted frame from %r at ~%.3f s -- shape %s.",
            video_path,
            timestamp_seconds,
            frame.shape,
        )

        return frame

    finally:
        cap.release()
