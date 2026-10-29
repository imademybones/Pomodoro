"""Generates grimdark app icons (hourglass + ember motif) for the PWA manifest."""
import math
from PIL import Image, ImageDraw, ImageFilter

BG_OUTER = (8, 6, 5)
BG_INNER = (26, 15, 12)
BRONZE = (120, 92, 48)
BRONZE_DIM = (70, 54, 30)
BONE = (214, 201, 173)
EMBER = (196, 58, 22)
EMBER_BRIGHT = (255, 120, 40)


def radial_bg(size, inner, outer, cx, cy, radius):
    img = Image.new("RGB", (size, size), outer)
    px = img.load()
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - cx, y - cy) / radius
            d = min(d, 1.0)
            r = int(inner[0] + (outer[0] - inner[0]) * d)
            g = int(inner[1] + (outer[1] - inner[1]) * d)
            b = int(inner[2] + (outer[2] - inner[2]) * d)
            px[x, y] = (r, g, b)
    return img


def draw_hourglass(draw, cx, cy, half_w, half_h, outline, fill_top, fill_bottom, width):
    top = [
        (cx - half_w, cy - half_h),
        (cx + half_w, cy - half_h),
        (cx + half_w * 0.18, cy),
        (cx - half_w * 0.18, cy),
    ]
    bottom = [
        (cx - half_w * 0.18, cy),
        (cx + half_w * 0.18, cy),
        (cx + half_w, cy + half_h),
        (cx - half_w, cy + half_h),
    ]
    draw.polygon(top, fill=fill_top)
    draw.polygon(bottom, fill=fill_bottom)
    draw.line(top + [top[0]], fill=outline, width=width, joint="curve")
    draw.line(bottom + [bottom[0]], fill=outline, width=width, joint="curve")
    cap_h = half_h * 0.16
    draw.rectangle([cx - half_w * 1.12, cy - half_h - cap_h, cx + half_w * 1.12, cy - half_h], fill=outline)
    draw.rectangle([cx - half_w * 1.12, cy + half_h, cx + half_w * 1.12, cy + half_h + cap_h], fill=outline)


def make_icon(size, maskable=False):
    cx = cy = size / 2
    img = radial_bg(size, BG_INNER, BG_OUTER, cx, cy * 0.85, size * 0.75)
    draw = ImageDraw.Draw(img)

    ring_r = size * (0.47 if not maskable else 0.40)
    draw.ellipse([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r], outline=BRONZE_DIM, width=max(2, size // 90))
    ring_r2 = ring_r - size * 0.025
    draw.ellipse([cx - ring_r2, cy - ring_r2, cx + ring_r2, cy + ring_r2], outline=BRONZE, width=max(2, size // 140))

    hg_scale = 0.30 if not maskable else 0.24
    half_w = size * hg_scale
    half_h = size * hg_scale * 1.15
    draw_hourglass(draw, cx, cy, half_w, half_h, BRONZE, (20, 14, 10), EMBER, max(3, size // 85))

    # ember glow sand falling through the neck
    glow_r = size * 0.02
    draw.ellipse([cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r], fill=EMBER_BRIGHT)

    img = img.filter(ImageFilter.GaussianBlur(0.4))
    glow_layer = Image.new("RGB", (size, size), (0, 0, 0))
    gdraw = ImageDraw.Draw(glow_layer)
    gdraw.ellipse([cx - glow_r * 3, cy - glow_r * 3, cx + glow_r * 3, cy + glow_r * 3], fill=EMBER_BRIGHT)
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(size * 0.03))
    img = Image.blend(img, Image.composite(glow_layer, img, glow_layer.convert("L").point(lambda p: min(p, 120))), 0.35)

    return img


FAVICON_BG_DARKMODE = (42, 20, 14)   # lighter warm bg so the glyph survives on near-black browser chrome
FAVICON_BG_LIGHTMODE = (10, 7, 6)    # near-black bg, reads fine against light browser chrome


def make_favicon(size, dark_variant):
    """Simplified, bolder glyph for tiny tab-icon sizes (no glow blend, thicker strokes)."""
    cx = cy = size / 2
    bg = FAVICON_BG_DARKMODE if dark_variant else FAVICON_BG_LIGHTMODE
    img = Image.new("RGB", (size, size), bg)
    draw = ImageDraw.Draw(img)

    ring_r = size * 0.46
    draw.ellipse([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r], outline=BRONZE_BRIGHT_FOR(dark_variant), width=max(1, round(size / 16)))

    half_w = size * 0.30
    half_h = size * 0.32
    outline = BRONZE_BRIGHT_FOR(dark_variant)
    sand = EMBER_BRIGHT if dark_variant else EMBER
    draw_hourglass(draw, cx, cy, half_w, half_h, outline, bg, sand, max(2, round(size / 11)))

    return img


def BRONZE_BRIGHT_FOR(dark_variant):
    return (214, 182, 112) if dark_variant else BRONZE


if __name__ == "__main__":
    import os
    out_dir = os.path.join(os.path.dirname(__file__), "..", "icons")
    os.makedirs(out_dir, exist_ok=True)
    make_icon(192).save(os.path.join(out_dir, "icon-192.png"))
    make_icon(512).save(os.path.join(out_dir, "icon-512.png"))
    make_icon(512, maskable=True).save(os.path.join(out_dir, "icon-maskable-512.png"))
    make_icon(180).save(os.path.join(out_dir, "apple-touch-icon.png"))

    favicon_light_32 = make_favicon(32, dark_variant=False)
    favicon_dark_32 = make_favicon(32, dark_variant=True)
    favicon_light_16 = make_favicon(16, dark_variant=False)
    favicon_light_32.save(os.path.join(out_dir, "favicon-32.png"))
    favicon_dark_32.save(os.path.join(out_dir, "favicon-32-dark.png"))
    favicon_light_16.save(os.path.join(out_dir, "favicon-16.png"))
    favicon_light_32.save(os.path.join(out_dir, "favicon.ico"), sizes=[(16, 16), (32, 32)])

    print("icons written")
