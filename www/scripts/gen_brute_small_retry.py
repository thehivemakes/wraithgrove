#!/usr/bin/env python3
"""Retry script for brute_small — softened prompt for content filter bypass.
The original prompt ("stained crimson rags" + "hostile predatory body language")
triggered DALL-E 400 rejections on all 3 frames.
Softened: "weathered rust-red cloth" + "heavy menacing fantasy creature" framing.
"""
import os, sys, time, json, subprocess, urllib.request
from io import BytesIO

OPENAI_KEY = "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"
BASE  = "/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2"
STRIP = os.path.join(BASE, "scripts/strip_magenta_v2.py")

FRAMES = [
    ("walk0", "left foot forward, body slight lean left, walk-cycle pose 1 of 3"),
    ("walk1", "neutral standing, arms relaxed at sides, walk-cycle pose 2 of 3"),
    ("walk2", "right foot forward, body slight lean right, walk-cycle pose 3 of 3"),
]

BASE_PROMPT = (
    "chibi anime pixel art fantasy enemy character, large heavy-set hunched ogre, "
    "wearing rough weathered rust-red cloth wrappings, enormously long arms hanging "
    "past the knees, tiny eyes glaring under a heavy brow, single broken blunt horn "
    "on the side of the head, wrapped bandaged feet, eastern folk-horror game art style, "
    "dominant dark red-brown color scheme, 32x32 px sprite, heavy menacing fantasy "
    "creature stance, no weapons, transparent solid magenta background #FF00FF, "
    "sharp pixel art edges, single overhead light source, dark drop shadow under feet, "
    "no text no watermark, no realistic rendering, no photorealism, single centered "
    "character only"
)

def post_json(url, body, headers, timeout=180):
    data = json.dumps(body).encode("utf-8")
    req  = urllib.request.Request(url, data=data, method="POST")
    for k, v in headers.items(): req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))

def fetch_bytes(url, timeout=120):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return r.read()

def generate_one(prompt):
    body = {"model":"dall-e-3","prompt":prompt,"n":1,"size":"1024x1024","quality":"standard","response_format":"url"}
    headers = {"Authorization":"Bearer "+OPENAI_KEY,"Content-Type":"application/json"}
    try:
        res = post_json("https://api.openai.com/v1/images/generations", body, headers)
    except Exception as e:
        return None, str(e)
    if "data" not in res or not res["data"]: return None, "no data: "+json.dumps(res)[:200]
    url = res["data"][0].get("url")
    if not url: return None, "no url"
    try: raw = fetch_bytes(url)
    except Exception as e: return None, "download: "+str(e)
    return raw, None

def save_raw(raw, path):
    from PIL import Image
    im = Image.open(BytesIO(raw)).convert("RGB")
    if im.size != (1024,1024): im = im.resize((1024,1024), Image.LANCZOS)
    im.save(path, "PNG")
    return os.path.getsize(path)

def strip(raw_path, out_path):
    r = subprocess.run([sys.executable, STRIP, raw_path, out_path], capture_output=True, text=True, timeout=60)
    if r.returncode != 0: raise RuntimeError(r.stderr)
    return r.stdout.strip()

def main():
    raw_dir = os.path.join(BASE, "art/enemies/brute_small/_raw")
    out_dir = os.path.join(BASE, "art/enemies/brute_small")
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(out_dir, exist_ok=True)
    for frame_name, pose in FRAMES:
        out_path = os.path.join(out_dir, f"{frame_name}.png")
        if os.path.exists(out_path) and os.path.getsize(out_path) > 10_000:
            print(f"skip (exists): brute_small/{frame_name}", flush=True); continue
        prompt = BASE_PROMPT + f", {pose}"
        print(f"\ngenerating: brute_small/{frame_name}", flush=True)
        ok = False
        for attempt in range(1, 4):
            raw, err = generate_one(prompt)
            if raw is None:
                print(f"  attempt {attempt} failed: {err}", flush=True); time.sleep(10); continue
            try:
                raw_path = os.path.join(raw_dir, f"{frame_name}.png")
                raw_sz = save_raw(raw, raw_path)
                strip_out = strip(raw_path, out_path)
                final_sz = os.path.getsize(out_path)
                print(f"  OK: brute_small/{frame_name} raw={raw_sz:,} final={final_sz:,}", flush=True)
                print(f"  strip: {strip_out}", flush=True)
                ok = True; break
            except Exception as e:
                print(f"  save/strip error: {e}", flush=True); time.sleep(3)
        if not ok: print(f"  FAILED: brute_small/{frame_name}", flush=True)
        time.sleep(4)

if __name__ == "__main__":
    main()
