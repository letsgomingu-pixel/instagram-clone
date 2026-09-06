"""Generate favicon / PWA / OG assets for i am not a fishmonger."""
from __future__ import annotations

import shutil
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
ASSETS_DIR = PUBLIC / "brand-assets"

BRAND_FILES = (
    "favicon.ico",
    "favicon.svg",
    "favicon-16x16.png",
    "favicon-32x32.png",
    "apple-touch-icon.png",
    "icon-192.png",
    "icon-512.png",
    "og-image.png",
    "app-icon.svg",
    "brand-icon.svg",
)

BRAND_BLUE = "#0095FF"
BRAND_WHITE = "#F5F5F5"
BRAND_BLACK = "#000000"

LINE1 = "i am not a"
LINE2 = "fishmonger"


def load_serif(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/georgiab.ttf") if bold else Path("C:/Windows/Fonts/georgia.ttf"),
        Path("C:/Windows/Fonts/timesbd.ttf") if bold else Path("C:/Windows/Fonts/times.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf")
        if bold
        else Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"),
        Path("/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf")
        if bold
        else Path("/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def draw_brand_mark(draw: ImageDraw.ImageDraw, size: int) -> None:
    """Small sizes: serif lowercase i (brand initial)."""
    font = load_serif(int(size * 0.72))
    bbox = draw.textbbox((0, 0), "i", font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1]
    draw.text((x, y), "i", fill=BRAND_BLUE, font=font)


def draw_brand_lockup(draw: ImageDraw.ImageDraw, width: int, height: int) -> None:
    """Medium+ sizes: two-line brand name."""
    line1_size = max(14, int(height * 0.11))
    line2_size = max(18, int(height * 0.155))
    font1 = load_serif(line1_size)
    font2 = load_serif(line2_size, bold=True)

    bbox1 = draw.textbbox((0, 0), LINE1, font=font1)
    bbox2 = draw.textbbox((0, 0), LINE2, font=font2)
    w1, h1 = bbox1[2] - bbox1[0], bbox1[3] - bbox1[1]
    w2, h2 = bbox2[2] - bbox2[0], bbox2[3] - bbox2[1]
    gap = int(height * 0.025)
    total_h = h1 + gap + h2
    y1 = (height - total_h) // 2 - bbox1[1]
    y2 = y1 + h1 + gap - bbox2[1]

    draw.text(((width - w1) // 2 - bbox1[0], y1), LINE1, fill=BRAND_BLUE, font=font1)
    draw.text(((width - w2) // 2 - bbox2[0], y2), LINE2, fill=BRAND_WHITE, font=font2)


def render_square(size: int, *, lockup: bool) -> Image.Image:
    img = Image.new("RGBA", (size, size), BRAND_BLACK)
    draw = ImageDraw.Draw(img)
    if lockup:
        draw_brand_lockup(draw, size, size)
    else:
        draw_brand_mark(draw, size)
    return img


def render_og() -> Image.Image:
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h), BRAND_BLACK)
    draw = ImageDraw.Draw(img)
    line1_size = 56
    line2_size = 88
    font1 = load_serif(line1_size)
    font2 = load_serif(line2_size, bold=True)

    bbox1 = draw.textbbox((0, 0), LINE1, font=font1)
    bbox2 = draw.textbbox((0, 0), LINE2, font=font2)
    w1, h1 = bbox1[2] - bbox1[0], bbox1[3] - bbox1[1]
    w2, h2 = bbox2[2] - bbox2[0], bbox2[3] - bbox2[1]
    gap = 12
    total_h = h1 + gap + h2
    y1 = (h - total_h) // 2 - bbox1[1]
    y2 = y1 + h1 + gap - bbox2[1]

    draw.text(((w - w1) // 2 - bbox1[0], y1), LINE1, fill=BRAND_BLUE, font=font1)
    draw.text(((w - w2) // 2 - bbox2[0], y2), LINE2, fill=BRAND_WHITE, font=font2)
    return img.convert("RGB")


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)

    small = {16: False, 32: False}
    large = {180: True, 192: True, 512: True}

    for size, lockup in {**small, **large}.items():
        name = {
            16: "favicon-16x16.png",
            32: "favicon-32x32.png",
            180: "apple-touch-icon.png",
            192: "icon-192.png",
            512: "icon-512.png",
        }[size]
        render_square(size, lockup=lockup).save(PUBLIC / name, optimize=True)

    base = render_square(512, lockup=True)
    base.resize((32, 32), Image.Resampling.LANCZOS).save(
        PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)]
    )
    render_og().save(PUBLIC / "og-image.png", optimize=True)
    package_download_assets()
    print(f"[OK] Icons written to {PUBLIC}")


def package_download_assets() -> None:
    """Copy icons to /brand-assets and bundle a zip for download."""
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    for name in BRAND_FILES:
        src = PUBLIC / name
        if src.exists():
            shutil.copy2(src, ASSETS_DIR / name)

    zip_path = ASSETS_DIR / "iamnotafishmonger-brand-icons.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name in BRAND_FILES:
            path = ASSETS_DIR / name
            if path.exists():
                zf.write(path, arcname=f"iamnotafishmonger/{name}")


if __name__ == "__main__":
    main()
