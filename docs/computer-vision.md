# Computer Vision & Frame Extraction Guide — GazeGuide TV

## 1. Overview
The Computer Vision & Content Pipeline extracts high-resolution video frames from educational content at designated timestamps. These frames are used to inspect scenes, manually annotate celestial objects, determine normalized bounding boxes, and assemble the lesson scene manifest.

## 2. Core Service Module
- **Location:** ackend/app/services/vision.py
- **Primary Function:** extract_frame(video_path: Union[str, Path], timestamp_seconds: float) -> np.ndarray

### How It Works
1. Validates 	imestamp_seconds >= 0 (raises ValueError otherwise).
2. Opens the video stream using OpenCV's cv2.VideoCapture.
3. Validates that the video file opened successfully (raises OSError if the file is missing or unreadable).
4. Seeks to the requested timestamp via cap.set(cv2.CAP_PROP_POS_MSEC, timestamp_seconds * 1000.0).
5. Reads a single frame as a NumPy array with BGR color channels (raises RuntimeError if past the end or decoding fails).
6. Always releases the video file handle using a 	ry ... finally: cap.release() block to prevent memory leaks or file locks.

*Note on Seeking Precision:* Video seeking in OpenCV is keyframe-dependent. Depending on video container and codec GOP structure, OpenCV moves to the nearest keyframe. Seeking is approximate.

---

## 3. Dependency Management
OpenCV and NumPy are specified in ackend/requirements.txt:
`	xt
opencv-python
numpy
`

### Installation
Activate your environment, then install dependencies:
`ash
pip install -r backend/requirements.txt
`

---

## 4. Running the Frame Extraction CLI Runner
A command-line script is provided at ackend/scripts/extract_frame.py.

### Basic Usage (Defaults: ssets/orbits-demo.mp4 at 5.0 seconds)
`ash
python backend/scripts/extract_frame.py
`

### Custom Timestamp and Output File
`ash
# Extract frame at 18.5 seconds (matching orbit-scene-02)
python backend/scripts/extract_frame.py assets/orbits-demo.mp4 18.5 assets/extracted_frames/orbit_scene_02.jpg
`

### Overwriting Existing Files
The runner prevents accidental clobbering of previously extracted frames. To replace an existing image, pass --overwrite:
`ash
python backend/scripts/extract_frame.py assets/orbits-demo.mp4 5.0 assets/extracted_frames/frame_5_000s.jpg --overwrite
`

### Output Directory
Extracted frames are saved in:
`
assets/extracted_frames/
`
The directory is automatically created if it does not exist.

---

## 5. Common Errors & Troubleshooting

| Error | Root Cause | Solution |
| :--- | :--- | :--- |
| ValueError: timestamp_seconds must be >= 0 | A negative timestamp was requested. | Pass a timestamp >= 0.0 seconds. |
| OSError: Cannot open video file | Path is nonexistent, or file is not a valid video file. | Verify file path and ensure file is a readable video format (.mp4). |
| RuntimeError: No frame could be decoded | The timestamp exceeds the video duration, or stream is corrupted. | Verify video duration before choosing a timestamp. |
| ERROR: ... already exists. Use --overwrite to replace it. | Output file already exists. | Use a different filename or append --overwrite. |
| ModuleNotFoundError: No module named 'cv2' | OpenCV is not installed in the active Python environment. | Run pip install -r backend/requirements.txt. |

---

## 6. Running Automated Tests
Tests are located in ackend/app/tests/test_vision.py. They use synthetic video generation so they run reliably without external asset dependencies, as well as an integration test verifying the actual production video.

To run:
`ash
cd backend
python -m pytest app/tests/test_vision.py -v
`

---

## 7. Asset Provenance: ssets/orbits-demo.mp4
- **File Path:** ssets/orbits-demo.mp4
- **File Size:** 55,209,383 bytes (~55.2 MB)
- **Resolution:** 3840 × 2160 (4K UHD)
- **Frame Rate:** 30.0 FPS
- **Duration:** 33.33 seconds (1,000 frames)
- **Source URL:** *Requires verification* (educational planetary orbits clip)
- **Creator / Author:** *Requires verification*
- **License Information:** *Requires verification*
- **Download Date:** *Requires verification*

---

## 8. Next Step: Scene Manifest & Object Annotation
With reliable frame extraction verified:
1. Open the saved frame in ssets/extracted_frames/frame_5_000s.jpg for visual inspection.
2. Confirm which planetary objects and orbital paths are clearly visible.
3. Determine normalized coordinates [ymin, xmin, ymax, xmax] for each object (values between 0.0 and 1.0).
4. Update ackend/data/lesson-manifest.json with the verified scene timestamps and object bounding boxes.
