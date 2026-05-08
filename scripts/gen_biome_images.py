#!/usr/bin/env python3
"""W-Biome-Illustrations — generate 6 ukiyo-e biome backgrounds via DALL-E 3.

Saves PNG to images/biomes/<id>.png at 1024x1280 (downsized from 1024x1792).
"""
import os
import sys
import time
import json
import urllib.request
from io import BytesIO

OPENAI_KEY = "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"

OUT_DIR = "/Users/defimagic/Desktop/Hive/MobileGameResearch/wood-siege/build-v2/images/biomes"
LOG_PATH = "/tmp/wg_biome_gen.jsonl"

STYLE = ("Ukiyo-e woodblock print style, paper-texture background, fine ink-line "
         "definition, washed/muted color palette (no oversaturation), eastern "
         "folk-horror atmosphere, deliberate negative space, painterly composition, "
         "no text, no characters, vertical composition.")

BIOMES = [
    ("forest_summer",
     "A misty Japanese forest village at dusk, paper lanterns hanging from rope "
     "lines between pine trees, distant pagoda silhouette in fog, narrow dirt "
     "path winding into deeper woods. Mood: welcoming-but-watchful, the moment "
     "before unease."),
    ("forest_autumn",
     "An autumn forest path, deep red and amber maple leaves carpeting the "
     "ground and falling, twisted black tree trunks, low golden light filtering "
     "through dense canopy, distant carved stone shrine peeking through trees. "
     "Mood: nostalgic dread."),
    ("cold_stone",
     "A frozen mountain pass, jagged ice spires and snow-capped peaks under a "
     "pale grey sky, drifting snow, ancient stone ridge cairns, frozen "
     "rope-bridge in the distance. Mood: bleak, ancestral cold."),
    ("temple",
     "A red-walled mountain temple at twilight, three-tier pagoda rising on "
     "stone steps, glowing paper lanterns, drifting embers and incense smoke, "
     "faint moon. Mood: sacred, forbidden."),
    ("cave",
     "A vast underground cave, stalactites dripping water glints, narrow stone "
     "path lit by distant torchlight, mineral veins glowing faintly violet, "
     "deep shadow ahead. Mood: descending, claustrophobic."),
    ("eldritch",
     "A torn-reality landscape, cracked violet sky bleeding starlight, broken "
     "sigil shards floating mid-air, twisted black trees with eyes in the bark, "
     "ground reflecting wrong colors. Mood: cosmic horror, the boundary "
     "tearing."),
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


def generate_one(biome_id, biome_prompt):
    full_prompt = STYLE + " " + biome_prompt
    body = {
        "model": "dall-e-3",
        "prompt": full_prompt,
        "n": 1,
        "size": "1024x1792",
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


def downsize_to(raw_bytes, target_w, target_h, dst_path):
    from PIL import Image
    im = Image.open(BytesIO(raw_bytes))
    im = im.convert("RGB")
    if im.size != (target_w, target_h):
        im = im.resize((target_w, target_h), Image.LANCZOS)
    im.save(dst_path, "PNG", optimize=True)
    return os.path.getsize(dst_path)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    log = []
    for biome_id, biome_prompt in BIOMES:
        dst = os.path.join(OUT_DIR, biome_id + ".png")
        if os.path.exists(dst) and os.path.getsize(dst) > 100_000:
            print("skip (exists):", biome_id, os.path.getsize(dst), flush=True)
            log.append({"id": biome_id, "status": "skipped",
                        "size_bytes": os.path.getsize(dst)})
            continue
        print("generating:", biome_id, flush=True)
        attempts = 0
        last_err = None
        while attempts < 2:
            attempts += 1
            raw, err, full_prompt = generate_one(biome_id, biome_prompt)
            if raw is None:
                last_err = err
                print("  attempt", attempts, "failed:", err, flush=True)
                time.sleep(8)
                continue
            try:
                size = downsize_to(raw, 1024, 1280, dst)
                log.append({
                    "id": biome_id,
                    "status": "ok",
                    "size_bytes": size,
                    "prompt": full_prompt,
                    "attempts": attempts,
                })
                print("  ok:", biome_id, size, "bytes", flush=True)
                break
            except Exception as e:
                last_err = "save error: " + str(e)
                print("  save failed:", e, flush=True)
                time.sleep(2)
        else:
            log.append({"id": biome_id, "status": "failed",
                        "error": last_err, "attempts": attempts,
                        "prompt": STYLE + " " + biome_prompt})
        time.sleep(4)
    with open(LOG_PATH, "w") as f:
        for entry in log:
            f.write(json.dumps(entry) + "\n")
    print("\nLOG:", LOG_PATH, flush=True)
    return log


if __name__ == "__main__":
    main()
