#!/usr/bin/env python3
"""Rebuild the v5 shortlist as 256/128/64/32 transparent PNGs.

Requires Python 3.10+ and Pillow. Run in a folder with:
  HQ_SHORTLIST_V5.csv
  source_alpha_v4/<original v4 transparency source files>
The GitHub repository has the text manifest and script; image sources remain
in the user-supplied ZIP (NOT committed to GitHub).
"""
from pathlib import Path
from PIL import Image
import csv

ROOT = Path(__file__).resolve().parent
with (ROOT / "HQ_SHORTLIST_V5.csv").open(encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))
ids = [r.get("ID") or r.get("アイコンID") for r in rows]
assert len(ids) == len(set(ids)) == 12
for size in (256,128,64,32):
    (ROOT / f"png_transparent_{size}").mkdir(exist_ok=True)
for id in ids:
    file = next((ROOT / "source_alpha_v4").glob(id + "_*.png"))
    rgba = Image.open(file).convert("RGBA")
    a = rgba.getchannel("A").point(lambda p: 0 if p < 26 else (255 if p > 230 else p))
    rgba.putalpha(a)
    bounds = a.point(lambda p: 255 if p > 35 else 0).getbbox()
    if not bounds:
        raise ValueError("No opaque content: " + id)
    crop = rgba.crop((max(0,bounds[0]-2),max(0,bounds[1]-2),min(256,bounds[2]+2),min(256,bounds[3]+2)))
    scale = min(222/crop.width, 217/crop.height)
    image = crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
    master = Image.new("RGBA",(256,256),(0,0,0,0))
    master.alpha_composite(image,((256-image.width)//2,(256-image.height)//2))
    for size in (256,128,64,32):
        output = master if size == 256 else master.resize((size,size),Image.Resampling.LANCZOS)
        output.save(ROOT / f"png_transparent_{size}" / (id + ".png"), optimize=True)
print("Generated",len(ids),"candidate icons in four sizes; production approval pending.")
