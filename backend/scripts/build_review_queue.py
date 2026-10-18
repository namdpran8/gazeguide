"""Create an evenly sampled 80-120 frame pending manual-review queue."""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; BACKEND=ROOT/'backend'
if str(BACKEND) not in sys.path: sys.path.insert(0,str(BACKEND))
from app.services.annotations import OBJECT_CLASSES
from app.services.vision import extract_frame
import cv2

def make_queue(frame_count:int,duration:float)->dict:
    if not 80 <= frame_count <= 120: raise ValueError('frame_count must be between 80 and 120')
    timestamps=[round(i*duration/(frame_count-1),3) for i in range(frame_count)]
    return {'schema_version':1,'dataset_name':'gazeguide-tv-review-queue-v1','coordinate_format':'normalized_xyxy','classes':list(OBJECT_CLASSES),'review_policy':'Annotate only visually identifiable Sun or individual planets. Never annotate orbital paths, labels, or asteroid particles. Do not infer a planet identity.','frames':[{'frame_id':f'review-{i:03d}','file_name':f"review_{t:06.3f}s".replace('.', '_') + '.jpg','timestamp_seconds':t,'review_status':'pending','annotations':[]} for i,t in enumerate(timestamps)]}

def main(argv:list[str]|None=None)->int:
    p=argparse.ArgumentParser();p.add_argument('--frame-count',type=int,default=90);p.add_argument('--duration',type=float,default=33.3);p.add_argument('--extract',action='store_true');p.add_argument('--video',default='assets/orbits-demo.mp4');p.add_argument('--images-dir',default='assets/extracted_frames/review_queue');p.add_argument('--output',default='assets/annotations/gazeguide-review-queue.json');a=p.parse_args(argv);q=make_queue(a.frame_count,a.duration);images=ROOT/a.images_dir
    if a.extract:
        images.mkdir(parents=True,exist_ok=True)
        for frame in q['frames']:
            path=images/frame['file_name']
            if not path.exists() and not cv2.imwrite(str(path),extract_frame(ROOT/a.video,frame['timestamp_seconds'])): raise OSError(f'could not write {path}')
    out=ROOT/a.output;out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(q,indent=2),encoding='utf-8');print(f'Created {out} with {len(q["frames"])} pending frames');return 0
if __name__=='__main__': raise SystemExit(main())
