#!/usr/bin/env python3
"""W-Boss-Portraits — generate 6 ukiyo-e boss portraits via DALL-E 3.

Saves raw to images/raw/bosses/<id>_raw.png, final 1024x1024 PNG to
images/bosses/<id>.png. Same style register as biome backgrounds and
character portraits (already shipped — see images/biomes/ + images/portraits/).
"""
import os
import sys
import time
import json
import urllib.request
from io import BytesIO

OPENAI_KEY = "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"

OUT_DIR = "/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/images/bosses"
RAW_DIR = "/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/images/raw/bosses"
LOG_PATH = "/tmp/wg_boss_gen.jsonl"

STYLE = ("Ukiyo-e woodblock print style boss portrait, paper-texture background, "
         "fine ink-line definition, washed muted dark color palette, eastern "
         "folk-horror cinematic boss reveal, single subject centered with "
         "menacing posture, no text, square composition, intense atmosphere.")

BOSSES = [
    ("pale_bride",
     "A spectral bride in tattered white wedding kimono, face partially veiled, "
     "long black hair drifting unnaturally upward, hovering above a dark temple "
     "floor, paper amulets floating around her, single tear of blood on her "
     "cheek. Stage 3 boss — Hollow Shrine. Mood: haunted bridal sorrow."),
    ("frozen_crone",
     "An ancient crone wrapped in ice-blue tattered robes, frost crystallizing on "
     "her wrinkled hands, gripping an ice-shard staff, swirling snow around her, "
     "pale-blue glowing eyes, jagged ice spires rising behind. Stage 6 boss — "
     "Throat of Ice. Mood: ancestral cold, withered malice."),
    ("autumn_lord",
     "A massive horned warrior in autumn-leaf armor with red and amber lacquer "
     "plates, dual crossed katanas, leaf-storm swirling around him, masked face "
     "with a single visible blood-red eye, standing in a forest clearing of "
     "fallen maple leaves. Stage 9 boss — Marrow Hollow. Mood: regal rot, "
     "predatory stillness."),
    ("temple_warden",
     "A stone-armored sentinel with a glowing geometric mask, ornate halberd "
     "planted before him, standing before a sealed temple gate, drifting ember "
     "motes, ancient sigils carved into his armor plates. Stage 12 boss — "
     "Vault of Names. Mood: implacable guardian, sacred wrath."),
    ("cave_mother",
     "A massive eldritch cave matriarch, dark elongated body with multiple "
     "faintly-glowing eyes scattered across her form, surrounded by smaller "
     "spawn-creatures clinging to her, dripping cave ceiling above, faint "
     "violet mineral light. Stage 15 boss — Cradle of Maw. Mood: brood-horror, "
     "smothering."),
    ("wraith_father",
     "The Wraith Father — a towering void-shape composed of swirling dark mist "
     "and bone-fragments, mask of broken sigils for a face, three pairs of "
     "skeletal arms reaching outward, violet starlight bleeding from gaps in "
     "his form. Endgame boss — final fight. Mood: cosmic dread, world-ending."),
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


def generate_one(boss_id, boss_prompt):
    full_prompt = STYLE + " " + boss_prompt
    body = {
        "model": "dall-e-3",
        "prompt": full_prompt,
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
        return None, "request error: " + str(e), full_prompt
    if "data" not in result or not result["data"]:
        return None, "no data: " + json.dumps(result)[:200], full_prompt
    img_url = result["data"][0].get("url")
    if not img_url:
        return None, "no url field", full_prompt
    try:
        raw = fetch_bytes(img_url)
    except Exception as e:
        return None, "download error: " + str(e), full_prompt
    return raw, None, full_prompt


def save_png(raw_bytes, dst_path, target_size=(1024, 1024)):
    from PIL import Image
    im = Image.open(BytesIO(raw_bytes))
    im = im.convert("RGB")
    if im.size != target_size:
        im = im.resize(target_size, Image.LANCZOS)
    im.save(dst_path, "PNG", optimize=True)
    return os.path.getsize(dst_path)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(RAW_DIR, exist_ok=True)
    log = []
    for boss_id, boss_prompt in BOSSES:
        dst = os.path.join(OUT_DIR, boss_id + ".png")
        raw_dst = os.path.join(RAW_DIR, boss_id + "_raw.png")
        if os.path.exists(dst) and os.path.getsize(dst) > 100_000:
            print("skip (exists):", boss_id, os.path.getsize(dst), flush=True)
            log.append({"id": boss_id, "status": "skipped",
                        "size_bytes": os.path.getsize(dst)})
            continue
        print("generating:", boss_id, flush=True)
        attempts = 0
        last_err = None
        ok = False
        while attempts < 3:
            attempts += 1
            raw, err, full_prompt = generate_one(boss_id, boss_prompt)
            if raw is None:
                last_err = err
                print("  attempt", attempts, "failed:", err, flush=True)
                time.sleep(8)
                continue
            try:
                with open(raw_dst, "wb") as f:
                    f.write(raw)
                size = save_png(raw, dst)
                log.append({
                    "id": boss_id,
                    "status": "ok",
                    "size_bytes": size,
                    "prompt": full_prompt,
                    "attempts": attempts,
                })
                print("  ok:", boss_id, size, "bytes", flush=True)
                ok = True
                break
            except Exception as e:
                last_err = "save error: " + str(e)
                print("  save failed:", e, flush=True)
                time.sleep(2)
        if not ok:
            log.append({"id": boss_id, "status": "failed",
                        "error": last_err, "attempts": attempts,
                        "prompt": STYLE + " " + boss_prompt})
        time.sleep(4)
    with open(LOG_PATH, "w") as f:
        for entry in log:
            f.write(json.dumps(entry) + "\n")
    print("\nLOG:", LOG_PATH, flush=True)
    return log


if __name__ == "__main__":
    main()
