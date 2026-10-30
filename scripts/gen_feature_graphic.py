"""Generates the 1024x500 Google Play feature graphic."""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(__file__))
from gen_icons import radial_bg, draw_hourglass, BRONZE, BRONZE_DIM, EMBER, EMBER_BRIGHT, BG_INNER, BG_OUTER

W, H = 1024, 500


def find_font(candidates, size):
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main():
    img = radial_bg(max(W, H) * 2, BG_INNER, BG_OUTER, W / 2, H / 2, max(W, H) * 0.95)
    img = img.crop(((img.width - W) // 2, (img.height - H) // 2, (img.width - W) // 2 + W, (img.height - H) // 2 + H))
    draw = ImageDraw.Draw(img)

    cx, cy = 150, H / 2
    half_w, half_h = 95, 115
    draw_hourglass(draw, cx, cy, half_w, half_h, BRONZE, (20, 14, 10), EMBER, 6)
    draw.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=EMBER_BRIGHT)

    ring_r = 170
    draw.ellipse([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r], outline=BRONZE_DIM, width=3)

    serif_bold = find_font([
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    ], 68)
    serif_bold_sm = find_font([
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    ], 58)
    serif_italic = find_font([
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
    ], 26)

    tx = 300
    draw.text((tx, 150), "POMODORO", font=serif_bold, fill=(214, 182, 112))
    draw.text((tx, 232), "OF THE DAMNED", font=serif_bold_sm, fill=(226, 69, 42))
    draw.text((tx, 320), "A grimdark focus timer for the ruthless.", font=serif_italic, fill=(217, 205, 180))

    out_dir = os.path.join(os.path.dirname(__file__), "..", "store")
    os.makedirs(out_dir, exist_ok=True)
    img.save(os.path.join(out_dir, "feature-graphic-1024x500.png"))
    print("feature graphic written")


if __name__ == "__main__":
    main()
