#!/usr/bin/env python3
"""Rebuild 196 Reverse Planner cropped icon candidates from original 12 sheets.

pip install Pillow
python docs/icons/extract_icons.py --sources ./source_sheets --output ./icon_crops

This makes background-retaining 256px PNG drafts for human review, not polished
transparent production icons. Preserve original image dimensions.
"""
import argparse
import csv
from pathlib import Path
from PIL import Image

def records(path):
    with path.open(encoding="utf-8-sig", newline="") as fp:
        return list(csv.DictReader(fp))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sources", type=Path, required=True, help="Folder containing original twelve PNG sheets")
    parser.add_argument("--output", type=Path, default=Path("icon_crops"))
    args = parser.parse_args()
    folder = Path(__file__).resolve().parent
    icon_rows = records(folder/"ICON_REGISTRY.csv")
    crop_rows = records(folder/"CROP_COORDINATES.csv")
    assert len(icon_rows) == len(crop_rows) == 196
    registry = {r["アイコンID"]:r for r in icon_rows}
    assert len(registry) == 196
    args.output.mkdir(parents=True, exist_ok=True)
    cache = {}
    seen = set()
    for row in crop_rows:
        key = row["アイコンID"]
        if key in seen: raise ValueError("Duplicated icon ID: "+key)
        seen.add(key)
        info = registry[key]
        if info["元画像ファイル名"] != row["元画像"]:
            raise ValueError("Source mismatch for "+key)
        source_file = args.sources / row["元画像"]
        if source_file not in cache: cache[source_file] = Image.open(source_file).convert("RGB")
        original = cache[source_file]
        expected = tuple(map(int, row["元画像サイズ"].split("x")))
        if original.size != expected: raise ValueError("Original size changed: "+str(source_file))
        x0, y0, x1, y1 = (int(v) for v in row["アイコン領域XYXY"].split())
        if not(0 <= x0 < x1 <= original.width and 0 <= y0 < y1 <= original.height):
            raise ValueError("Invalid rectangle for "+key)
        crop = original.crop((x0,y0,x1,y1))
        if info["シートID"] in ("S11","S12"):
            # Draft icon catalog cells are tiny. Enlarge evenly for review.
            ratio = min(213/crop.width, 173/crop.height)
            crop = crop.resize((max(1,round(crop.width*ratio)),max(1,round(crop.height*ratio))),Image.Resampling.LANCZOS)
        else:
            crop.thumbnail((231,218),Image.Resampling.LANCZOS)
        tile = Image.new("RGB",(256,256),"#FFFDF7")
        tile.paste(crop,((256-crop.width)//2,(256-crop.height)//2))
        tile.save(args.output / info["切り出し後推奨ファイル名"])
    if len(seen) != 196: raise ValueError("Missing icon(s)")
    print("Created",len(seen),"draft icon PNGs in",args.output)
    print("Visual verification, background cleanup and UI selection are still required.")

if __name__ == "__main__": main()
