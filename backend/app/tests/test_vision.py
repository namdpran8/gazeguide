import os
from pathlib import Path

import cv2
import numpy as np
import pytest

from app.services.vision import extract_frame


FOURCC = cv2.VideoWriter_fourcc(*"mp4v")  
SYNTHETIC_FPS = 10
SYNTHETIC_DURATION_S = 3   
SYNTHETIC_WIDTH = 64
SYNTHETIC_HEIGHT = 48


@pytest.fixture(scope="module")
def synthetic_video(tmp_path_factory) -> Path:
    path = tmp_path_factory.mktemp("videos") / "synthetic.mp4"
    writer = cv2.VideoWriter(
        str(path),
        FOURCC,
        float(SYNTHETIC_FPS),
        (SYNTHETIC_WIDTH, SYNTHETIC_HEIGHT),
    )

    if not writer.isOpened():
        pytest.skip(
            "VideoWriter could not be opened with the mp4v codec.  "
            "The codec may not be available in this environment.  "
            "Skipping all synthetic-video tests."
        )

    total_frames = SYNTHETIC_FPS * SYNTHETIC_DURATION_S
    colours = [
        (0, 0, 200),     
        (0, 200, 0),    
        (200, 0, 0),     
    ]
    for i in range(total_frames):
        colour = colours[i // SYNTHETIC_FPS]
        frame = np.full(
            (SYNTHETIC_HEIGHT, SYNTHETIC_WIDTH, 3), colour, dtype=np.uint8
        )
        writer.write(frame)

    writer.release()

    if not path.exists() or path.stat().st_size == 0:
        pytest.skip("Synthetic video was not written correctly.")

    return path



class TestExtractFrameHappyPath:
    
    def test_returns_numpy_array(self, synthetic_video):
        frame = extract_frame(synthetic_video, 1.0)
        assert isinstance(frame, np.ndarray), "Expected a numpy.ndarray"

    def test_frame_is_not_empty(self, synthetic_video):
        frame = extract_frame(synthetic_video, 1.0)
        assert frame.size > 0, "Frame must not be empty"

    def test_frame_dimensions_are_plausible(self, synthetic_video):
        frame = extract_frame(synthetic_video, 1.0)
        # Shape is (height, width, channels).  We just check the frame is 3-D
        # with 3 colour channels; exact pixel dimensions can vary slightly by
        # codec, so we do not assert strict equality.
        assert frame.ndim == 3, "Frame should be 3-dimensional (H, W, C)"
        assert frame.shape[2] == 3, "Frame should have 3 colour channels"
        assert frame.shape[0] > 0, "Frame height must be > 0"
        assert frame.shape[1] > 0, "Frame width must be > 0"

    def test_accepts_pathlib_path(self, synthetic_video):
        assert isinstance(synthetic_video, Path)
        frame = extract_frame(synthetic_video, 0.5)
        assert frame is not None

    def test_accepts_string_path(self, synthetic_video):
        frame = extract_frame(str(synthetic_video), 0.5)
        assert frame is not None

    def test_timestamp_zero_works(self, synthetic_video):
        frame = extract_frame(synthetic_video, 0.0)
        assert isinstance(frame, np.ndarray)


class TestExtractFrameErrors:
    def test_negative_timestamp_raises_value_error(self, synthetic_video):
        with pytest.raises(ValueError, match="timestamp_seconds must be >= 0"):
            extract_frame(synthetic_video, -1.0)

    def test_very_negative_timestamp_raises_value_error(self, synthetic_video):
        with pytest.raises(ValueError):
            extract_frame(synthetic_video, -999.9)

    def test_nonexistent_file_raises_os_error(self, tmp_path):
        missing = tmp_path / "does_not_exist.mp4"
        with pytest.raises(OSError, match="Cannot open video file"):
            extract_frame(missing, 0.0)

    def test_not_a_video_file_raises_os_error(self, tmp_path):
        fake = tmp_path / "not_a_video.mp4"
        fake.write_text("this is not video data")
        with pytest.raises(OSError, match="Cannot open video file"):
            extract_frame(fake, 0.0)

    def test_timestamp_past_end_raises_runtime_error(self, synthetic_video):
        with pytest.raises(RuntimeError, match="No frame could be decoded"):
            extract_frame(synthetic_video, 9999.0)


_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_REAL_VIDEO = _PROJECT_ROOT / "assets" / "orbits-demo.mp4"


@pytest.mark.skipif(
    not _REAL_VIDEO.exists(),
    reason=(
        "assets/orbits-demo.mp4 not present.  "
        "Download the video to run this integration test."
    ),
)
class TestExtractFrameRealVideo:
    """Integration tests that run against the actual production asset."""

    def test_real_video_extracts_frame(self):
        frame = extract_frame(_REAL_VIDEO, 5.0)
        assert isinstance(frame, np.ndarray)
        assert frame.size > 0

    def test_real_video_frame_has_expected_channels(self):
        frame = extract_frame(_REAL_VIDEO, 5.0)
        assert frame.ndim == 3
        assert frame.shape[2] == 3

    def test_real_video_frame_dimensions_nonzero(self):
        frame = extract_frame(_REAL_VIDEO, 5.0)
        height, width, _ = frame.shape
        assert height > 0 and width > 0
