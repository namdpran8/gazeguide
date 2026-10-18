"""
extract_frame.py — command-line runner for GazeGuide TV frame extraction.

Usage
-----
Run from the project root (the directory that contains assets/ and backend/):

    python backend/scripts/extract_frame.py [VIDEO_PATH] [TIMESTAMP_SECONDS] [OUTPUT_PATH]

Arguments (all optional — sensible defaults are used):
    VIDEO_PATH          Path to the source video.
                        Default: assets/orbits-demo.mp4 (relative to project root)
    TIMESTAMP_SECONDS   Seconds into the video to capture.
                        Default: 5.0
    OUTPUT_PATH         Where to save the extracted image.
                        Default: assets/extracted_frames/frame_<timestamp>s.jpg

Examples
--------
    # Use all defaults (extracts 5-second frame from the solar-system video):
    python backend/scripts/extract_frame.py

    # Custom timestamp only:
    python backend/scripts/extract_frame.py assets/orbits-demo.mp4 18.5

    # Fully specified:
    python backend/scripts/extract_frame.py assets/orbits-demo.mp4 18.5 assets/extracted_frames/scene02.jpg

Exit codes
----------
    0   Success.
    1   Bad arguments or frame extraction failed.

Notes
-----
* This script is a thin CLI wrapper around extract_frame() in vision.py.
  Do not add business logic here — keep the module simple.
* The output directory is created automatically if it does not exist.
* An existing file at OUTPUT_PATH will NOT be overwritten; the script exits
  with an error instead so you never silently clobber a previous extraction.
  Pass --overwrite (or rename the existing file) to allow replacement.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Path resolution helpers
# ---------------------------------------------------------------------------

# Resolve the project root as the parent of the directory that contains this
# script's parent package (backend/scripts/ -> backend/ -> project root).
# This works as long as the file is at backend/scripts/extract_frame.py.
_SCRIPT_DIR = Path(__file__).resolve().parent          # .../backend/scripts
_PROJECT_ROOT = _SCRIPT_DIR.parent.parent              # .../gazeguide-1

# Add backend/ to sys.path so that rom app.services.vision import ... works
# when the script is run directly (without pip install -e .).
_BACKEND_DIR = _SCRIPT_DIR.parent                      # .../backend
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app.services.vision import extract_frame  # noqa: E402  (after sys.path fix)
import cv2  # noqa: E402


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="extract_frame",
        description=(
            "Extract a single frame from a video and save it as an image.\n"
            "Part of the GazeGuide TV computer-vision pipeline."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "video_path",
        nargs="?",
        default=str(_PROJECT_ROOT / "assets" / "orbits-demo.mp4"),
        help=(
            "Path to the source video file.  "
            "Default: assets/orbits-demo.mp4 (relative to project root)."
        ),
    )
    parser.add_argument(
        "timestamp_seconds",
        nargs="?",
        type=float,
        default=5.0,
        help="Seconds into the video to capture.  Default: 5.0.",
    )
    parser.add_argument(
        "output_path",
        nargs="?",
        default=None,
        help=(
            "Destination image path.  "
            "Default: assets/extracted_frames/frame_<timestamp>s.jpg."
        ),
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        default=False,
        help="Overwrite the output file if it already exists.",
    )
    return parser


# ---------------------------------------------------------------------------
# Main logic
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    video_path = Path(args.video_path)
    timestamp = args.timestamp_seconds

    # Build the default output path if none was given.
    if args.output_path is None:
        ts_str = f"{timestamp:.3f}".replace(".", "_")
        output_path = (
            _PROJECT_ROOT
            / "assets"
            / "extracted_frames"
            / f"frame_{ts_str}s.jpg"
        )
    else:
        output_path = Path(args.output_path)

    # ------------------------------------------------------------------ #
    # Guard: refuse to overwrite an existing file unless --overwrite given.
    # ------------------------------------------------------------------ #
    if output_path.exists() and not args.overwrite:
        print(
            f"ERROR: {output_path} already exists.  "
            "Use --overwrite to replace it.",
            file=sys.stderr,
        )
        return 1

    # ------------------------------------------------------------------ #
    # Extract the frame.
    # ------------------------------------------------------------------ #
    try:
        frame = extract_frame(video_path, timestamp)
    except (ValueError, OSError, RuntimeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    # ------------------------------------------------------------------ #
    # Save to disk.
    # ------------------------------------------------------------------ #
    output_path.parent.mkdir(parents=True, exist_ok=True)

    success = cv2.imwrite(str(output_path), frame)
    if not success:
        print(
            f"ERROR: cv2.imwrite() failed for {output_path}.  "
            "Check that the file extension is a supported image format "
            "(e.g. .jpg, .png) and that the directory is writable.",
            file=sys.stderr,
        )
        return 1

    height, width, channels = frame.shape
    print(f"Saved: {output_path}")
    print(f"Dimensions: {width} x {height} px, {channels} channels")
    print(f"Timestamp requested: {timestamp:.3f} s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
