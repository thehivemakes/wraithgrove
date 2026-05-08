#!/usr/bin/env python3
"""Resize enemy sprites to 256x256 to hit 30-200KB target.
Run after strip_magenta. Overwrites in-place (keeps RGBA transparency).
"""
import os, sys
from PIL import Image

TARGET = (256, 256)
BASE = "/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/art/enemies"

enemy_ids = ["lurker", "walker", "sprite", "brute_small", "caller"]

for eid in enemy_ids:
    for frame in ["walk0", "walk1", "walk2"]:
        path = os.path.join(BASE, eid, f"{frame}.png")
        if not os.path.exists(path):
            print(f"SKIP (missing): {eid}/{frame}.png")
            continue
        sz_before = os.path.getsize(path)
        im = Image.open(path).convert("RGBA")
        if im.size == TARGET:
            print(f"already {TARGET}: {eid}/{frame}.png ({sz_before:,} bytes)")
            continue
        im = im.resize(TARGET, Image.LANCZOS)
        im.save(path, "PNG", optimize=True)
        sz_after = os.path.getsize(path)
        in_range = "OK" if 30_000 <= sz_after <= 200_000 else "OUT-OF-RANGE"
        print(f"{in_range}: {eid}/{frame}.png {sz_before:,} → {sz_after:,} bytes")

print("done")
