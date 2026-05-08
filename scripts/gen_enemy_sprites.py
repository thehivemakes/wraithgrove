#!/usr/bin/env python3
"""W-Enemy-Sprites (Wake) — Generate 5 enemy × 3 frames = 15 sprites via DALL-E 3.

Each enemy gets 3 walk-cycle frames on a solid magenta #FF00FF background.
strip_magenta_v2.py is run on each raw PNG immediately after download to
produce a transparent-background sprite.

Output:
  art/enemies/<id>/_raw/<frame>.png  — raw DALL-E output
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
LOG_PATH = "/tmp/wg_enemy_sprites_gen.jsonl"

FRAME_POSES = [
    "left foot forward, body slight lean left, walk-cycle pose 1 of 3",
    "neutral standing, arms relaxed, walk-cycle pose 2 of 3",
    "right foot forward, body slight lean right, walk-cycle pose 3 of 3",
]
FRAME_NAMES = ["walk0", "walk1", "walk2"]

# Base prompts adapted from MIDJOURNEY_BRIEFS.md.
# MJ --no directives moved into positive prompt.
# "corpse" softened to "shambling undead figure" for content filter safety.
ENEMIES = [
    {
        "id": "lurker",
        "base_prompt": (
            "chibi anime pixel art enemy, small slumped humanoid silhouette in "
            "tattered black rags, faceless except for two small reddish glowing "
            "pinpoint eyes, long stringy black hair hanging past the eyes, hunched "
            "gait, dominant color #1a0a08, glowing accent #a82828, 32x32 px sprite, "
            "hostile predatory body language, claws only no visible weapon, "
            "transparent magenta #FF00FF solid background, sharp pixel edges, "
            "single overhead light source, soft black drop shadow under feet, "
            "no text no watermark, no realistic shading, no photorealism, "
            "no western horror demons, no gore, single character centered"
        ),
    },
    {
        "id": "walker",
        "base_prompt": (
            "chibi anime pixel art enemy, stocky upright shambling undead figure in "
            "faded dark-red ceremonial robes, sallow grey skin, vacant white pupils, "
            "walks straight without flinching, hands at sides, dominant color #7a2818, "
            "glowing accent #3a1408, 32x32 px sprite, hostile predatory body language, "
            "claws only no visible weapon, "
            "transparent magenta #FF00FF solid background, sharp pixel edges, "
            "single overhead light source, soft black drop shadow under feet, "
            "no text no watermark, no realistic shading, no photorealism, "
            "no western horror demons, no gore, single character centered"
        ),
    },
    {
        "id": "sprite",
        "base_prompt": (
            "chibi anime pixel art enemy, tiny floating violet wisp-creature, "
            "vaguely humanoid head with three small glowing eyes and a wisp-tail "
            "instead of legs, hovering slightly off the ground, dominant color #5a2878, "
            "glowing accent #2a1438, 32x32 px sprite, hostile predatory body language, "
            "no visible weapon, "
            "transparent magenta #FF00FF solid background, sharp pixel edges, "
            "single overhead light source, soft black drop shadow under feet, "
            "no text no watermark, no realistic shading, no photorealism, "
            "no western horror demons, no gore, single character centered"
        ),
    },
    {
        "id": "brute_small",
        "base_prompt": (
            "chibi anime pixel art enemy, heavy-set hunched ogre-figure in stained "
            "crimson rags, massive arms hanging past knees, tiny eyes, single broken "
            "horn on the side of head, bandaged feet, dominant color #9a2018, "
            "glowing accent #4a1008, 32x32 px sprite, hostile predatory body language, "
            "claws only no visible weapon, "
            "transparent magenta #FF00FF solid background, sharp pixel edges, "
            "single overhead light source, soft black drop shadow under feet, "
            "no text no watermark, no realistic shading, no photorealism, "
            "no western horror demons, no gore, single character centered"
        ),
    },
    {
        "id": "caller",
        "base_prompt": (
            "chibi anime pixel art enemy, tall thin gaunt spirit figure in deep "
            "purple ceremonial robes with painted prayer-script on the front, holds "
            "a small ceremonial bell in one hand, mouth permanently open in a silent "
            "shout, dominant color #3a2858, glowing accent #1a1228, 32x32 px sprite, "
            "hostile predatory body language, bell is a ritual item not a weapon, "
            "transparent magenta #FF00FF solid background, sharp pixel edges, "
            "single overhead light source, soft black drop shadow under feet, "
            "no text no watermark, no realistic shading, no photorealism, "
            "no western horror demons, no gore, single character centered"
        ),
    },
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
    revised = result["data"][0].get("revised_prompt", "")
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
    sz = os.path.getsize(path)
    return sz


def main():
    log = []
    for enemy in ENEMIES:
        eid = enemy["id"]
        raw_dir = os.path.join(ART_DIR, eid, "_raw")
        out_dir = os.path.join(ART_DIR, eid)
        os.makedirs(raw_dir, exist_ok=True)
        os.makedirs(out_dir, exist_ok=True)

        for fi, (frame_name, frame_pose) in enumerate(zip(FRAME_NAMES, FRAME_POSES)):
            raw_path = os.path.join(raw_dir, f"{frame_name}.png")
            out_path = os.path.join(out_dir, f"{frame_name}.png")

            if os.path.exists(out_path) and check_size(out_path) > 10_000:
                sz = check_size(out_path)
                print(f"skip (exists): {eid}/{frame_name} {sz:,} bytes", flush=True)
                log.append({"id": eid, "frame": frame_name, "status": "skipped", "size_bytes": sz})
                continue

            full_prompt = enemy["base_prompt"] + f", {frame_pose}"
            print(f"\ngenerating: {eid}/{frame_name}", flush=True)
            print(f"  prompt (first 120): {full_prompt[:120]}...", flush=True)

            attempts = 0
            ok = False
            last_err = None

            while attempts < 3 and not ok:
                attempts += 1
                raw, err = generate_one(full_prompt)
                if raw is None:
                    last_err = err
                    print(f"  attempt {attempts} failed: {err}", flush=True)
                    time.sleep(10)
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
                        "prompt": full_prompt, "attempts": attempts,
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
                    "error": last_err, "attempts": attempts, "prompt": full_prompt,
                })
                print(f"  FAILED after {attempts} attempts: {last_err}", flush=True)

            # Sequential: pause between DALL-E calls to avoid rate limits
            time.sleep(4)

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
