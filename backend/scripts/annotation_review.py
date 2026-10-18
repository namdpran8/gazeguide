"""Create a local browser-based reviewer for GazeGuide TV training boxes.

The reviewer writes a downloaded JSON file.  It never writes the lesson
manifest, thereby preserving lesson, scene, object, and API identifiers.
"""

from __future__ import annotations

import argparse
import base64
import json
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _SCRIPT_DIR.parent.parent
_BACKEND_DIR = _SCRIPT_DIR.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app.services.annotations import load_annotation_document  # noqa: E402


def _image_data_uri(path: Path) -> str:
    suffix = path.suffix.lower()
    media_type = "image/jpeg" if suffix in {".jpg", ".jpeg"} else "image/png"
    return f"data:{media_type};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def build_reviewer_html(dataset: dict, images_dir: Path) -> str:
    embedded = {}
    for frame in dataset["frames"]:
        image_path = images_dir / frame["file_name"]
        if not image_path.exists():
            raise FileNotFoundError(f"Referenced frame does not exist: {image_path}")
        embedded[frame["file_name"]] = _image_data_uri(image_path)
    payload = json.dumps({"dataset": dataset, "images": embedded}).replace("</", "<\\/")
    return f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>GazeGuide annotation review</title>
<style>body{{font:14px system-ui;margin:20px;background:#101218;color:#edf0f5}} main{{display:grid;grid-template-columns:minmax(600px,1fr) 300px;gap:18px}} canvas{{width:100%;border:1px solid #586176;cursor:crosshair}} button,select{{padding:7px;margin:3px 0;width:100%}} #notice{{color:#f4c86a}} .box{{padding:12px;background:#1c2029;border-radius:8px}} li{{margin:6px 0}}</style>
<h1>GazeGuide TV annotation review</h1><p>Draw only the Sun or a planet whose identity is visually supported. Do not annotate orbital paths, labels, or asteroid particles. If identity is uncertain, leave it unannotated.</p>
<main><section><canvas id="canvas"></canvas><p id="notice"></p></section><aside class="box"><label>Frame <select id="frame"></select></label><label>Class <select id="klass"></select></label><label>Reviewer <input id="reviewer" required placeholder="your name"></label><button id="approve">Mark approved</button><button id="changes">Needs changes</button><button id="reject">Reject frame</button><button id="download">Download reviewed JSON</button><h3>Boxes</h3><ul id="boxes"></ul></aside></main>
<script>const payload={payload}, classes={json.dumps(list(__import__('app.services.annotations', fromlist=['OBJECT_CLASSES']).OBJECT_CLASSES))}; const dataset=payload.dataset, images=payload.images; let index=0,start=null;
const c=document.querySelector('#canvas'),ctx=c.getContext('2d'),sel=document.querySelector('#frame'),klass=document.querySelector('#klass'),notice=document.querySelector('#notice'),boxes=document.querySelector('#boxes'); classes.forEach(x=>klass.add(new Option(x,x))); dataset.frames.forEach((f,i)=>sel.add(new Option(`${{f.file_name}} (${{f.timestamp_seconds}}s)`,i)));
const image=new Image(); function frame(){{return dataset.frames[index]}} function draw(){{const f=frame(); image.src=images[f.file_name]; image.onload=()=>{{c.width=image.naturalWidth;c.height=image.naturalHeight;ctx.drawImage(image,0,0); ctx.lineWidth=Math.max(3,c.width/900);ctx.font=`${{Math.max(18,c.width/100)}}px sans-serif`;f.annotations.forEach((a,n)=>{{let [x1,y1,x2,y2]=a.bbox; x1*=c.width;y1*=c.height;x2*=c.width;y2*=c.height;ctx.strokeStyle='#65d6ff';ctx.strokeRect(x1,y1,x2-x1,y2-y1);ctx.fillStyle='#65d6ff';ctx.fillText(`${{a.class}} #${{n+1}}`,x1,y1-6)}}); renderList(); notice.textContent=`Status: ${{f.review_status}}. Drag to add a box; delete removes a box.`}}}}
function renderList(){{boxes.innerHTML='';frame().annotations.forEach((a,i)=>{{let li=document.createElement('li'),b=document.createElement('button');b.textContent=`Delete ${{a.class}}`;b.onclick=()=>{{frame().annotations.splice(i,1);draw()}};li.append(b);boxes.append(li)}})}}
function pos(e){{let r=c.getBoundingClientRect();return [(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]}} c.onpointerdown=e=>start=pos(e);c.onpointerup=e=>{{if(!start)return;let end=pos(e),x1=Math.min(start[0],end[0]),y1=Math.min(start[1],end[1]),x2=Math.max(start[0],end[0]),y2=Math.max(start[1],end[1]);start=null;if(x2-x1<.005||y2-y1<.005){{notice.textContent='Box is too small; draw again.';return}} frame().annotations.push({{annotation_id:`review-${{Date.now()}}-${{frame().annotations.length+1}}`,class:klass.value,bbox:[x1,y1,x2,y2],source:'human_review'}});frame().review_status='needs_changes';draw()}};
sel.onchange=()=>{{index=+sel.value;draw()}};document.querySelector('#approve').onclick=()=>{{const reviewer=document.querySelector('#reviewer').value.trim();if(!reviewer){{notice.textContent='Enter your name before approving.';return}}frame().review_status='approved';frame().reviewed_by=reviewer;draw()}};document.querySelector('#changes').onclick=()=>{{frame().review_status='needs_changes';draw()}};document.querySelector('#reject').onclick=()=>{{frame().review_status='rejected';frame().annotations=[];draw()}};document.querySelector('#download').onclick=()=>{{let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(dataset,null,2)],{{type:'application/json'}}));a.download='gazeguide-reviewed-annotations.json';a.click();URL.revokeObjectURL(a.href)}};draw();</script>'''


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Create a self-contained annotation review HTML file.")
    parser.add_argument("--dataset", default="assets/annotations/gazeguide-review.json")
    parser.add_argument("--images-dir", default="assets/extracted_frames")
    parser.add_argument("--output", default="assets/annotations/annotation-review.html")
    args = parser.parse_args(argv)
    dataset = load_annotation_document(_PROJECT_ROOT / args.dataset)
    output = _PROJECT_ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(build_reviewer_html(dataset, _PROJECT_ROOT / args.images_dir), encoding="utf-8")
    print(f"Created {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
