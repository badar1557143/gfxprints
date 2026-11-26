#!/usr/bin/env python3
"""Makes hoodie mockup photos: a transparent design placed on the chest of the real hoodie photos.
Usage: python3 tools/make-hoodie-mockups.py [key]
Add a design to DESIGNS (key -> art PNG with transparent background, in assets/templates/art/).
Writes assets/products/design-<key>-hoodie-<colour>-front.webp (900 x 1200) and the small copy in assets/products/sm/ (480 x 600)."""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
# key -> art PNG, or key -> {art, view, colours}. view "back" puts the print on the back photo (large print); colours limits the list.
DESIGNS = {
    "nature-life": "assets/templates/art/nature-life-partridge-sunrise.png",
    "markhor": {"art": "assets/templates/art/markhor-snowy-peaks.png", "view": "back", "colours": ["Black", "Navy", "Heather Grey", "Charcoal Grey"],
                "box": [278, 455, 636, 846]},   # print area on the 900 x 1200 back photo: the design is fitted inside it and centred,
}
COLOURS = ["Black", "White", "Beige", "Maroon", "Navy", "Purple", "Royal Blue", "Heather Grey", "Light Pink", "Red", "Charcoal Grey"]
CHEST_TOP = 0.35       # top of the print, as a share of photo height (below the hood opening)
PRINT_W = 0.29         # print width as a share of photo width

def slug(c): return c.lower().replace(" ", "-")

def hoodie_mask(rgb):
    # the photos sit on a near-white background
    bg = (rgb.min(axis=2) > 240)
    return ~bg

def make(key, spec):
    if isinstance(spec, str): spec = {"art": spec}
    view = spec.get("view", "front")
    chest_top = 0.385 if view == "back" else CHEST_TOP
    print_w = 0.34 if view == "back" else PRINT_W
    art = Image.open(os.path.join(ROOT, spec["art"])).convert("RGBA")
    for c in spec.get("colours", COLOURS):
        src = os.path.join(ROOT, "assets/products/hoodie-%s-%s.webp" % (view, slug(c)))
        base = Image.open(src).convert("RGB")
        W, H = base.size
        arr = np.array(base).astype(np.float32)
        m = hoodie_mask(arr.astype(np.uint8))
        row = m[int(H * (0.30 if view == "back" else 0.40))]
        xs = np.where(row)[0]
        cx = (xs.min() + xs.max()) / 2.0
        if "box" in spec:
            bx0, by0, bx1, by1 = spec["box"]
            vis = art.crop(art.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox())
            k = min((bx1 - bx0) / vis.width, (by1 - by0) / vis.height)
            pw, ph = int(vis.width * k), int(vis.height * k)
            d = vis.resize((pw, ph), Image.LANCZOS)
            x0 = int((bx0 + bx1) / 2 - pw / 2); y0 = int((by0 + by1) / 2 - ph / 2)
        else:
            pw = int(W * print_w)
            ph = int(pw * art.height / art.width)
            d = art.resize((pw, ph), Image.LANCZOS)
            x0 = int(cx - pw / 2); y0 = int(H * chest_top)
        # fabric shading: folds of the hoodie show through the print a little
        region = arr[y0:y0 + ph, x0:x0 + pw]
        lum = region.mean(axis=2)
        lum = np.array(Image.fromarray(lum.astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)
        ref = np.median(lum[m[y0:y0 + ph, x0:x0 + pw]]) if m[y0:y0 + ph, x0:x0 + pw].any() else 128
        shade = 1.0 + (lum / max(ref, 1.0) - 1.0) * 0.6
        shade = np.clip(shade, 0.8, 1.12)[:, :, None]
        da = np.array(d).astype(np.float32)
        rgb = np.clip(da[:, :, :3] * shade, 0, 255)
        a = (da[:, :, 3:4] / 255.0) * 0.97
        out = region * (1 - a) + rgb * a
        arr[y0:y0 + ph, x0:x0 + pw] = out
        img = Image.fromarray(arr.astype(np.uint8))
        name = "design-%s-hoodie-%s-%s.webp" % (key, slug(c), view)
        img.save(os.path.join(ROOT, "assets/products", name), "WEBP", quality=86, method=6)
        img.resize((480, 600), Image.LANCZOS).save(os.path.join(ROOT, "assets/products/sm", name), "WEBP", quality=82, method=6)
        print("made", name)

if __name__ == "__main__":
    keys = sys.argv[1:] or list(DESIGNS)
    for k in keys: make(k, DESIGNS[k])
