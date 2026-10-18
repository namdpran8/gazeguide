
from __future__ import annotations
import argparse, json, shutil, sys
from collections import Counter
from pathlib import Path
from typing import Any
import cv2

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / 'backend'
if str(BACKEND) not in sys.path: sys.path.insert(0, str(BACKEND))
from app.services.annotations import OBJECT_CLASSES, AnnotationValidationError, load_annotation_document


def split_for_timestamp(timestamp: float, max_timestamp: float) -> str:
    ratio = 0.0 if max_timestamp <= 0 else timestamp / max_timestamp
    return 'train' if ratio < .70 else 'val' if ratio < .85 else 'test'


def image_hash(path: Path) -> str:
    image = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if image is None: raise AnnotationValidationError(f'unreadable image: {path}')
    tiny = cv2.resize(image, (8, 8), interpolation=cv2.INTER_AREA)
    mean = float(tiny.mean())
    return ''.join('1' if value >= mean else '0' for value in tiny.flatten())


def build_dataset(document: dict[str, Any], images_dir: Path, output_dir: Path, copy_images: bool = True) -> dict[str, Any]:
    approved = [f for f in document['frames'] if f['review_status'] == 'approved']
    max_timestamp = max((float(f['timestamp_seconds']) for f in document['frames']), default=0.0)
    report: dict[str, Any] = {'source_dataset': document.get('dataset_name'), 'approval_rule': 'review_status=approved and non-empty reviewed_by', 'split_policy': 'contiguous timestamps: [0%,70%) train, [70%,85%) val, [85%,100%] test', 'candidate_frames': len(document['frames']), 'approved_frames': len(approved), 'splits': {n:{'frames':0,'instances':0,'classes':{}} for n in ('train','val','test')}, 'class_instances': {n:0 for n in OBJECT_CLASSES}, 'cross_split_near_duplicates': [], 'excluded': dict(Counter(f['review_status'] for f in document['frames'] if f['review_status'] != 'approved'))}
    hashes: list[tuple[str,str,str]]=[]
    output_dir.mkdir(parents=True, exist_ok=True)
    for frame in approved:
        image_path = images_dir / frame['file_name']
        if not image_path.exists(): raise AnnotationValidationError(f'missing image for approved frame: {image_path}')
        split = split_for_timestamp(float(frame['timestamp_seconds']), max_timestamp)
        report['splits'][split]['frames'] += 1
        labels=[]
        for annotation in frame['annotations']:
            klass=annotation['class']; labels.append(annotation)
            report['class_instances'][klass]+=1; report['splits'][split]['instances']+=1
            report['splits'][split]['classes'][klass]=report['splits'][split]['classes'].get(klass,0)+1
        hashes.append((frame['file_name'], split, image_hash(image_path)))
        if copy_images:
            dest=output_dir/split/'images'/image_path.name; dest.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(image_path,dest)
            label=output_dir/split/'labels'/f'{image_path.stem}.json'; label.parent.mkdir(parents=True,exist_ok=True)
            label.write_text(json.dumps({'frame_id':frame['frame_id'],'timestamp_seconds':frame['timestamp_seconds'],'annotations':labels},indent=2),encoding='utf-8')
    for i,(left,left_split,left_hash) in enumerate(hashes):
        for right,right_split,right_hash in hashes[i+1:]:
            distance=sum(a != b for a,b in zip(left_hash,right_hash,strict=True))
            if left_split != right_split and distance <= 4: report['cross_split_near_duplicates'].append({'left':left,'left_split':left_split,'right':right,'right_split':right_split,'hamming_distance':distance})
    report['insufficient_classes']=[klass for klass,count in report['class_instances'].items() if count < 20]
    (output_dir/'dataset-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    return report


def main(argv: list[str] | None = None) -> int:
    parser=argparse.ArgumentParser(description='Build a time-split dataset from approved GazeGuide annotations.')
    parser.add_argument('--annotations',default='assets/annotations/gazeguide-review.json'); parser.add_argument('--images-dir',default='assets/extracted_frames'); parser.add_argument('--output-dir',default='assets/datasets/gazeguide-v1'); parser.add_argument('--report-only',action='store_true')
    args=parser.parse_args(argv); document=load_annotation_document(ROOT/args.annotations)
    report=build_dataset(document,ROOT/args.images_dir,ROOT/args.output_dir,not args.report_only); print(json.dumps(report,indent=2)); return 0 if report['approved_frames'] else 2
if __name__ == '__main__': raise SystemExit(main())
