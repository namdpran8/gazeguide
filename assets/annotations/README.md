# Annotation review

Open `annotation-review.html` in a modern browser. It is self-contained, so no
server is required. Select a frame, choose a class, and drag a rectangle around
the object. Delete an incorrect rectangle with its corresponding button, mark
the frame approved when it is complete, then use **Download reviewed JSON**.

The reviewer exports normalized `[x_min, y_min, x_max, y_max]` boxes. Keep the
downloaded file separate from `lesson-manifest.json`: the manifest is a runtime
lesson/API contract and is not a training-label file.

Allowed training classes are `sun`, `mercury`, `venus`, `earth`, `mars`,
`jupiter`, `saturn`, `uranus`, and `neptune`. Do not draw boxes around orbital
paths, on-screen labels, or asteroid particles. If a body cannot be identified
from the image itself, leave it unannotated rather than inferring its identity.

To rebuild the reviewer after changing `gazeguide-review.json`:

```powershell
python backend/scripts/annotation_review.py
```

Suggested first dataset: 80--120 frames across the 33.33-second clip, with
roughly even temporal coverage plus extra frames at scene transitions and when
object scale/occlusion changes. Split by contiguous time ranges (for example,
70% early, 15% middle, 15% late) to prevent near-duplicate frames appearing in
both training and evaluation. Review every box manually and reserve only
approved frames for model training.
