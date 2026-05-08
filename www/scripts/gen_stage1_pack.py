#!/usr/bin/env python3
"""W-Enemy-Sprites-Stage1-Pack (Mend) — Generate 4 Stage 1 enemies × 3 frames = 12 sprites.

Closes THE GATE from AUDIT_v029_Unlimited_Chaos: red_zombie, pumpkin_lantern,
skull_swarmer, wraith_fast all lacked sprites in Stage 1 (Lantern Vigil).

Output:
  art/enemies/<id>/_raw/<frame>.png  — raw DALL-E 3 output
  art/enemies/<id>/<frame>.png       — magenta-stripped, RGBA transparent
"""

import os
import sys
import time
import json
import subprocess
import urllib.request
from io import BytesIO

OPENAI_KEY = "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"

BASE = "/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2"
ART_DIR = os.path.join(BASE, "art/enemies")
STRIP_SCRIPT = os.path.join(BASE, "scripts/strip_magenta_v2.py")
LOG_PATH = "/tmp/wg_stage1_pack_gen.jsonl"

FRAME_POSES = [
    "left foot forward, body slight lean left, walk-cycle pose 1 of 3",
    "neutral standing, arms relaxed, walk-cycle pose 2 of 3",
    "right foot forward, body slight lean right, walk-cycle pose 3 of 3",
]
FRAME_NAMES = ["walk0", "walk1", "walk2"]

# Prompts adapted from MIDJOURNEY_BRIEFS.md.
# "corpse"/"horror" softened per DALL-E content filter guidance.
# wraith_fast uses "drift" poses since it's a floating ghost.
ENEMIES = [
    {
        "id": "red_zombie",
        "base_prompt": (
            "chibi anime pixel art game enemy, cloaked humanoid spirit figure in dark "
            "crimson-brown hooded robe, pale sallow face visible under hood, dark hollow "
            "eye sockets, robe widening to ground like a trapezoid, arms hidden inside "
            "sleeves, dominant color #a82820, glowing accent #ffe0b0, 32x32 px sprite, "
            "hostile predatory body language, no visible weapon, "
            "transparent magenta #FF00FF solid background, sharp pixel edges, "
            "single overhead light source, soft black drop shadow under feet, "
            "no text no watermark, no realistic shading, no photorealism, "
            "no western demons, no gore, single character centered, eastern folk-horror register"
        ),
    },
    {
        "id": "pumpkin_lantern",
        "base_prompt": (
            "chibi anime pixel art game enemy, thin dark stick-figure body with an "
            "oversized glowing orange pumpkin for a head, triangular glowing eyes and "
            "jagged mouth carved into the pumpkin, small dark arm stubs extending sideways, "
            "bare stick-legs ending in black shoes, green-brown stem on pumpkin crown, "
            "dominant color #e07820, glowing accent #ffc848, 32x32 px sprite, "
            "hostile predatory body language, no visible weapon, "
            "transparent magenta #FF00FF solid background, sharp pixel edges, "
            "single overhead light source, soft black drop shadow under feet, "
            "no text no watermark, no realistic shading, no photorealism, "
            "no western demons, no gore, single character centered, eastern folk-horror register"
        ),
    },
    {
        "id": "skull_swarmer",
        "base_prompt": (
            "chibi anime pixel art game enemy, small skeletal fantasy imp, enormous "
            "bone-white rounded skull head oversized compared to a tiny dark stick-skeleton "
            "body, hollow dark eye sockets, row of small teeth, thin stick arms and stick "
            "legs in dark brown, dominant color #e8e0d0, accent #3a2010, 32x32 px sprite, "
            "aggressive darting body language, no visible weapon, "
            "transparent magenta #FF00FF solid background, sharp pixel edges, "
            "single overhead light source, soft black drop shadow under feet, "
            "no text no watermark, no realistic shading, no photorealism, "
            "no western demons, no gore, single character centered, eastern folk-horror register, "
            "cute chibi fantasy creature style"
        ),
    },
    {
        "id": "wraith_fast",
        "base_prompt": (
            "chibi anime pixel art game enemy, small fast ghost wisp spirit creature, "
            "blue-grey oval body with a fading transparent tail trailing below it, "
            "no legs, hollow dark dot eyes, faint blue-white glow at the edges, "
            "dominant color #404858, glowing accent #a8c0e8, 32x32 px sprite, "
            "fast darting floating body language, no visible weapon, "
            "transparent magenta #FF00FF solid background, sharp pixel edges, "
            "single overhead light source, no drop shadow hovering spirit, "
            "no text no watermark, no realistic shading, no photorealism, "
            "no western demons, no gore, single character centered, eastern folk-horror register"
        ),
    },
]

# wraith_fast is a drifting ghost — use drift poses for walk frames
WRAITH_POSES = [
    "drifting left, slight lean left, drift-cycle pose 1 of 3",
    "centered floating upright, drift-cycle pose 2 of 3",
    "drifting right, slight lean right, drift-cycle pose 3 of 3",
]


def post_json(url, body, headers, timeout=180):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    for k, v in headers.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_bytes(url, timeout=120):
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return resp.read()


def generate_one(prompt):
    body = {
        "model": "dall-e-3",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
        "quality": "standard",
        "response_format": "url",
    }
    headers = {
        "Authorization": "Bearer " + OPENAI_KEY,
        "Content-Type": "application/json",
    }
    try:
        result = post_json(
            "https://api.openai.com/v1/images/generations", body, headers
        )
    except Exception as e:
        return None, "request error: " + str(e)
    if "data" not in result or not result["data"]:
        return None, "no data: " + json.dumps(result)[:300]
    img_url = result["data"][0].get("url")
    if not img_url:
        return None, "no url field"
    try:
        raw = fetch_bytes(img_url)
    except Exception as e:
        return None, "download error: " + str(e)
    return raw, None


def save_raw(raw_bytes, raw_path):
    from PIL import Image
    im = Image.open(BytesIO(raw_bytes)).convert("RGB")
    if im.size != (1024, 1024):
        im = im.resize((1024, 1024), Image.LANCZOS)
    im.save(raw_path, "PNG")
    return os.path.getsize(raw_path)


def strip_magenta(raw_path, out_path):
    result = subprocess.run(
        [sys.executable, STRIP_SCRIPT, raw_path, out_path],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode != 0:
        raise RuntimeError(f"strip_magenta failed: {result.stderr}")
    return result.stdout.strip()


def check_size(path):
    return os.path.getsize(path)


def main():
    log = []
    for enemy in ENEMIES:
        eid = enemy["id"]
        raw_dir = os.path.join(ART_DIR, eid, "_raw")
        out_dir = os.path.join(ART_DIR, eid)
        os.makedirs(raw_dir, exist_ok=True)
        os.makedirs(out_dir, exist_ok=True)

        poses = WRAITH_POSES if eid == "wraith_fast" else FRAME_POSES

        for fi, (frame_name, frame_pose) in enumerate(zip(FRAME_NAMES, poses)):
            raw_path = os.path.join(raw_dir, f"{frame_name}.png")
            out_path = os.path.join(out_dir, f"{frame_name}.png")

            if os.path.exists(out_path) and check_size(out_path) > 10_000:
                sz = check_size(out_path)
                print(f"skip (exists): {eid}/{frame_name} {sz:,} bytes", flush=True)
                log.append({"id": eid, "frame": frame_name, "status": "skipped", "size_bytes": sz})
                continue

            full_prompt = enemy["base_prompt"] + f", {frame_pose}"
            print(f"\ngenerating: {eid}/{frame_name}", flush=True)
            print(f"  prompt (first 140): {full_prompt[:140]}...", flush=True)

            attempts = 0
            ok = False
            last_err = None
            current_prompt = full_prompt

            while attempts < 2 and not ok:
                attempts += 1
                raw, err = generate_one(current_prompt)

                if raw is None:
                    last_err = err
                    print(f"  attempt {attempts} failed: {err}", flush=True)
                    # Soften prompt for retry: replace any remaining edgy terms
                    current_prompt = current_prompt.replace("hollow dark eye sockets", "dark circular eyes")
                    current_prompt = current_prompt.replace("row of small teeth", "small rounded mouth")
                    time.sleep(8)
                    continue

                try:
                    raw_sz = save_raw(raw, raw_path)
                    print(f"  raw saved: {raw_sz:,} bytes", flush=True)

                    strip_out = strip_magenta(raw_path, out_path)
                    print(f"  strip: {strip_out}", flush=True)

                    final_sz = check_size(out_path)
                    if final_sz < 5_000:
                        raise RuntimeError(f"stripped file too small: {final_sz} bytes")

                    log.append({
                        "id": eid, "frame": frame_name, "status": "ok",
                        "raw_bytes": raw_sz, "final_bytes": final_sz,
                        "prompt": current_prompt, "attempts": attempts,
                    })
                    print(f"  OK: {eid}/{frame_name} → {final_sz:,} bytes", flush=True)
                    ok = True

                except Exception as e:
                    last_err = f"save/strip error: {e}"
                    print(f"  save/strip failed: {e}", flush=True)
                    time.sleep(3)

            if not ok:
                log.append({
                    "id": eid, "frame": frame_name, "status": "failed",
                    "error": last_err, "attempts": attempts, "prompt": current_prompt,
                })
                print(f"  FAILED after {attempts} attempts: {last_err}", flush=True)

            # Sequential — pause between DALL-E calls
            time.sleep(5)

    with open(LOG_PATH, "w") as f:
        for entry in log:
            f.write(json.dumps(entry) + "\n")

    ok_count = sum(1 for e in log if e.get("status") == "ok")
    skip_count = sum(1 for e in log if e.get("status") == "skipped")
    fail_count = sum(1 for e in log if e.get("status") == "failed")
    print(f"\n=== DONE: {ok_count} generated, {skip_count} skipped, {fail_count} failed ===")
    print(f"LOG: {LOG_PATH}")
    if fail_count > 0:
        print("FAILED items:")
        for e in log:
            if e.get("status") == "failed":
                print(f"  {e['id']}/{e['frame']}: {e.get('error', '?')}")


if __name__ == "__main__":
    main()
