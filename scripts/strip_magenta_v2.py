#!/usr/bin/env python3
"""strip_magenta_v2.py - Sonnet 08 / Pin Quest polish.

Two-pass background remover for sprites with soft pink/magenta gradients
that the canonical strip_magenta.py (chroma-key) leaves halos around.

Pass A - hue-based fade:
  HSV centred on hue 320 deg with falloff. Identifies clear background
  pixels (high score) vs likely-content (low score) vs edge band.

Pass B - residual halo killer:
  Catches what Pass A misses: bright opaque magenta-dominant pixels
  outside the central hue band (eg purple-blue tinted edges around 280
  deg), plus an edge-zone cleanup within a few pixels of transparency.

Decontamination: edge-band pixels have R and B pulled toward G to remove
inherited magenta bleed from anti-aliased edges.

Usage:
  python3 strip_magenta_v2.py <input.png> <output.png>
"""

import sys
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation


def rgb_to_hsv(arr_rgb):
    a = arr_rgb.astype(float) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = np.max(a, axis=-1)
    mn = np.min(a, axis=-1)
    d = mx - mn
    h = np.zeros_like(mx)
    s = np.zeros_like(mx)
    v = mx
    nz = d > 1e-9
    s[nz] = d[nz] / mx[nz]
    rmask = nz & (mx == r)
    gmask = nz & (mx == g) & ~rmask
    bmask = nz & (mx == b) & ~rmask & ~gmask
    h[rmask] = ((g[rmask] - b[rmask]) / d[rmask]) % 6.0
    h[gmask] = ((b[gmask] - r[gmask]) / d[gmask]) + 2.0
    h[bmask] = ((r[bmask] - g[bmask]) / d[bmask]) + 4.0
    h *= 60.0
    return h, s, v


def magenta_score(h, s, v):
    """Pass A score: how strongly a pixel reads as pink/magenta background."""
    dh = np.minimum(np.abs(h - 320.0), np.abs((h + 360.0) - 320.0))
    dh = np.minimum(dh, np.abs((h - 360.0) - 320.0))
    hue_fit = np.clip(1.0 - dh / 50.0, 0.0, 1.0)
    sat_fit = np.clip((s - 0.18) / 0.45, 0.0, 1.0)
    val_fit = np.clip((v - 0.15) / 0.40, 0.0, 1.0)
    return hue_fit * sat_fit * val_fit


def strip(in_path, out_path):
    im = Image.open(in_path).convert('RGBA')
    arr = np.array(im)
    rgb = arr[..., :3].astype(float)
    a = arr[..., 3].astype(float)
    h, s, v = rgb_to_hsv(arr[..., :3])
    score = magenta_score(h, s, v)

    # Pass A: three-band alpha curve + decontamination on edge band.
    fade = np.clip((0.50 - score) / 0.35, 0.0, 1.0)
    fade[score <= 0.15] = 1.0
    fade[score >= 0.50] = 0.0
    new_a = a * fade

    edge_band = (score > 0.15) & (score < 0.50)
    tint = np.where(edge_band, score, 0.0) * np.maximum(
        0.0, np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
    )
    new_r = np.clip(rgb[..., 0] - tint * 0.7, 0, 255)
    new_b = np.clip(rgb[..., 2] - tint * 0.7, 0, 255)

    # Pass B: residual halo killer on the post-Pass-A buffer.
    r_b = new_r.astype(int)
    g_b = rgb[..., 1].astype(int)
    b_b = new_b.astype(int)
    a_b = new_a

    # B1: bright opaque magenta-dominant pixels missed by Pass A
    #     (eg purple-blue tinted around hue 280 deg).
    bright_pink = (
        (a_b > 200)
        & ((r_b - g_b) > 40)
        & ((b_b - g_b) > 40)
        & (np.maximum(r_b, b_b) > 215)
    )

    # B2: edge-zone cleanup within 5 px of fully transparent pixels.
    transparent = (a_b == 0)
    edge_zone = binary_dilation(transparent, iterations=5) & ~transparent
    mag_dom = np.maximum(0, np.minimum(r_b - g_b, b_b - g_b))
    halo_e = np.where(edge_zone, np.clip(mag_dom / 60.0, 0, 1), 0.0)

    halo = np.maximum(halo_e, bright_pink.astype(float))

    a_final = a_b * (1.0 - halo)
    pull = halo * 0.7
    r_final = np.clip(r_b - (r_b - g_b) * pull, 0, 255)
    b_final = np.clip(b_b - (b_b - g_b) * pull, 0, 255)

    out = arr.copy()
    out[..., 0] = r_final.astype(np.uint8)
    out[..., 2] = b_final.astype(np.uint8)
    out[..., 3] = np.clip(a_final, 0, 255).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(out_path, 'PNG')

    a_chk = out[..., 3]
    r_chk = out[..., 0].astype(int)
    g_chk = out[..., 1].astype(int)
    b_chk = out[..., 2].astype(int)
    halo_after = (a_chk > 30) & ((r_chk - g_chk) > 50) & ((b_chk - g_chk) > 50)
    visible = int((a_chk > 30).sum())
    print(
        f'wrote {out_path}: alpha extrema {(int(a_chk.min()), int(a_chk.max()))} '
        f'visible={visible} residual_halo={int(halo_after.sum())}'
    )


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(f'Usage: {sys.argv[0]} <input.png> <output.png>')
        sys.exit(1)
    strip(sys.argv[1], sys.argv[2])
