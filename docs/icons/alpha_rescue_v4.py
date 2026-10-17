#!/usr/bin/env python3
"""Experimental alpha-mask rescue for selected SOFT PIXEL cats.

Usage:
    pip install pillow numpy opencv-python scipy
    python docs/icons/alpha_rescue_v4.py --crops ./crops_256 --output ./alpha_v4

This creates ALPHA-MASK CANDIDATES only. Their visual quality must be verified on
cream/mint/charcoal backgrounds before any UI adoption. Never overwrite originals.
"""
import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy.ndimage import binary_fill_holes

PILOT_IDS = (
    "RP-CATWORK-S09-I01", "RP-CATWORK-S09-I02", "RP-CATWORK-S09-I03",
    "RP-CATWORK-S09-I10", "RP-CATEMO-S10-I01", "RP-CATEMO-S10-I07",
    "RP-CATEMO-S10-I08", "RP-CATVAR-S11-I14", "RP-CATVAR-S11-I20",
    "RP-CATVAR-S11-I28", "RP-CATVAR-S11-I47", "RP-PATCAT-S12-I02",
    "RP-PATCAT-S12-I16", "RP-PATCAT-S12-I20", "RP-PATCAT-S12-I28",
    "RP-PATCAT-S12-I47",
)

def make_mask(img):
    rgb = np.asarray(img.convert("RGB"))
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    fg = ((rgb.min(axis=2) < 155) |
          ((hsv[:, :, 1] > 68) & (hsv[:, :, 2] < 255))).astype("uint8") * 255
    closed = cv2.morphologyEx(fg, cv2.MORPH_CLOSE,
                             np.ones((5, 5), np.uint8), iterations=1)
    contours, _ = cv2.findContours(
        closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros(closed.shape, dtype=np.uint8)
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 12:
            continue
        cv2.drawContours(filled, [contour], -1, 255, -1)
        if area > 1300:
            hull = cv2.convexHull(contour)
            if cv2.contourArea(hull) < area * 2.1:
                cv2.drawContours(filled, [hull], -1, 255, -1)
    filled = cv2.dilate(filled, np.ones((2, 2), np.uint8), iterations=1)
    alpha = cv2.GaussianBlur(filled, (3, 3), 0.4)
    # Protect near-white cat bodies when removing a similar cream background.
    arr = rgb.astype(np.int16)
    red, green, blue = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    white = ((red >= 250) & (green >= 250) & (blue >= 237) &
             (np.abs(red - green) <= 1) & ((red - blue) <= 15))
    white &= ~((red >= 254) & (green == 253) & (blue >= 246))
    near_ink = cv2.dilate(
        (alpha > 10).astype("uint8"),
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (33, 33))) > 0
    alpha[white & near_ink] = 255
    close2 = cv2.morphologyEx((alpha > 0).astype("uint8"),
                             cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    alpha[binary_fill_holes(close2 > 0)] = 255
    return Image.fromarray(np.dstack([rgb, alpha]), "RGBA")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--crops", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.crops.resolve() == args.output.resolve():
        parser.error("output must differ from crops to protect originals")
    args.output.mkdir(parents=True, exist_ok=True)
    for asset_id in PILOT_IDS:
        hits = list(args.crops.glob(asset_id + "_*.png"))
        if len(hits) != 1:
            raise ValueError(f"Expected one input file for {asset_id}, found {len(hits)}")
        result = make_mask(Image.open(hits[0]))
        result.save(args.output / hits[0].name)
    print(f"Created {len(PILOT_IDS)} unapproved transparency trials")

if __name__ == "__main__":
    main()
