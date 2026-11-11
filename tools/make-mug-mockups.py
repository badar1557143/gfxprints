#!/usr/bin/env python3
"""Builds the ready-made design mug photos (one design on every mug colour, 3 views each).

Run from the site folder:  python3 tools/make-mug-mockups.py
Needs Python 3 + Pillow (pip install pillow).

Input : assets/templates/art/<design>.png   (transparent artwork, square 1400x1400 canvas, same layout as the Design Studio preview)
        assets/products/mug-<colour>.webp, mug-right-<colour>.webp, mug-front-<colour>.webp  (blank mug photos)
Output: assets/products/design-<key>-mug-<colour>-<view>.webp   (view = left | right | front)
The artwork is multiplied onto the mug photo so the mug's light and shadow show through the print.
"""
import os, sys
from PIL import Image, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "assets", "products")
ART = os.path.join(ROOT, "assets", "templates", "art")

DESIGNS = {"umrah": "umrah-mubarak-watercolor", "hajj": "hajj-mubarak-kaaba-name", "birthday": "pastel-birthday-photo-mug"}
COLOURS = ["white", "red", "orange", "light-blue", "royal-blue", "pink", "purple", "light-green", "black"]
# Photo file per view, then where the design sits on that photo (1000 x 1250 px photos):
#   centre x of the visible mug body, the printed width, and the centre y.
# The body centre was measured from the coloured rim of each photo (the handle shifts the mug sideways in the side views),
# so the design is centred on the mug body, not on the photo.
VIEWS = {
    "left":  ("mug-{c}.webp",       (626, 486, 631)),
    "right": ("mug-right-{c}.webp", (373, 486, 631)),
    "front": ("mug-front-{c}.webp", (498, 486, 631)),
}

def place(base, art, spot):
    cx, aw, cy = spot
    art = art.resize((aw, aw), Image.LANCZOS)
    layer = Image.new("RGBA", base.size, (255, 255, 255, 0))
    layer.paste(art, (int(round(cx - aw / 2.0)), int(round(cy - aw / 2.0))), art)
    alpha = layer.getchannel("A")
    mult = ImageChops.multiply(base.convert("RGB"), layer.convert("RGB"))
    return Image.composite(mult, base.convert("RGB"), alpha)

def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    n = 0
    for key, art_name in DESIGNS.items():
        if only and key != only:
            continue
        art = Image.open(os.path.join(ART, art_name + ".png")).convert("RGBA")
        for c in COLOURS:
            for view, (pattern, spot) in VIEWS.items():
                base = Image.open(os.path.join(P, pattern.format(c=c)))
                out = place(base, art, spot)
                name = "design-%s-mug-%s-%s.webp" % (key, c, view)
                out.save(os.path.join(P, name), "WEBP", quality=80, method=6)
                # Small 480 x 600 copy for shop cards and thumbnails (gfxThumb() in js/products.js loads assets/products/sm/)
                os.makedirs(os.path.join(P, "sm"), exist_ok=True)
                out.resize((480, 600), Image.LANCZOS).save(os.path.join(P, "sm", name), "WEBP", quality=80, method=6)
                n += 1
    print("wrote", n, "photos")

if __name__ == "__main__":
    main()
