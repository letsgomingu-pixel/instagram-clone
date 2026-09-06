"""Generate favicon / PWA / OG assets from the official brand icon master."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
MASTER = PUBLIC / "brand-icon-master.png"

BRAND_BLACK = "#000000"
BRAND_BLUE = "#0095FF"
SITE_ORIGIN = "https://www.iamnotafishmonger.com"

SVG_TEMPLATE = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" fill="#000000"/>
  <text
    x="256"
    y="228"
    text-anchor="middle"
    font-family="'Outfit', system-ui, sans-serif"
    font-size="52"
    font-weight="700"
    fill="{BRAND_BLUE}"
  >i am not a</text>
  <text
    x="256"
    y="298"
    text-anchor="middle"
    font-family="'Outfit', system-ui, sans-serif"
    font-size="52"
    font-weight="700"
    fill="{BRAND_BLUE}"
  >fishmonger</text>
</svg>
"""


def load_master() -> Image.Image:
    if not MASTER.exists():
        raise FileNotFoundError(
            f"Missing {MASTER}. Place the official brand icon PNG at this path before running."
        )
    return Image.open(MASTER).convert("RGBA")


def save_png(path: Path, image: Image.Image) -> None:
    image.save(path, format="PNG", optimize=True)


def save_jpg(path: Path, image: Image.Image, *, quality: int = 92) -> None:
    image.save(path, format="JPEG", quality=quality, optimize=True)


def save_ico(path: Path, master: Image.Image) -> None:
    sizes = [16, 32, 48]
    frames = [master.resize((s, s), Image.Resampling.LANCZOS) for s in sizes]
    frames[-1].save(path, format="ICO", sizes=[(s, s) for s in sizes])


def _load_bold_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        candidate = Path(path)
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def render_favicon_mark(size: int) -> Image.Image:
    """Single-letter favicon for tiny sizes (16/32/48)."""
    img = Image.new("RGBA", (size, size), BRAND_BLACK)
    draw = ImageDraw.Draw(img)
    font = _load_bold_font(max(10, int(size * 0.72)))
    draw.text((size / 2, size / 2), "i", font=font, fill=BRAND_BLUE, anchor="mm")
    return img


def render_og_landscape(master: Image.Image) -> Image.Image:
    canvas_w, canvas_h = 1200, 630
    og = Image.new("RGBA", (canvas_w, canvas_h), BRAND_BLACK)

    max_w = int(canvas_w * 0.90)
    max_h = int(canvas_h * 0.72)
    ratio = min(max_w / master.width, max_h / master.height)
    new_size = (max(1, int(master.width * ratio)), max(1, int(master.height * ratio)))
    resized = master.resize(new_size, Image.Resampling.LANCZOS)

    x = (canvas_w - new_size[0]) // 2
    y = (canvas_h - new_size[1]) // 2
    og.paste(resized, (x, y), resized)
    return og.convert("RGB")


def render_og_square(master: Image.Image, *, size: int = 800) -> Image.Image:
    """Square OG image — KakaoTalk renders link previews as a square thumbnail."""
    og = Image.new("RGBA", (size, size), BRAND_BLACK)

    max_side = int(size * 0.88)
    ratio = min(max_side / master.width, max_side / master.height)
    new_size = (max(1, int(master.width * ratio)), max(1, int(master.height * ratio)))
    resized = master.resize(new_size, Image.Resampling.LANCZOS)

    x = (size - new_size[0]) // 2
    y = (size - new_size[1]) // 2
    og.paste(resized, (x, y), resized)
    return og.convert("RGB")


def write_svg(path: Path) -> None:
    path.write_text(SVG_TEMPLATE, encoding="utf-8")


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    master = load_master()

    save_png(PUBLIC / "favicon-16x16.png", render_favicon_mark(16))
    save_png(PUBLIC / "favicon-32x32.png", render_favicon_mark(32))
    save_ico(PUBLIC / "favicon.ico", render_favicon_mark(48))

    pwa_sizes = {
        180: "apple-touch-icon.png",
        192: "icon-192.png",
        512: "icon-512.png",
    }
    for size, name in pwa_sizes.items():
        save_png(PUBLIC / name, master.resize((size, size), Image.Resampling.LANCZOS))

    landscape = render_og_landscape(master)
    square = render_og_square(master)

    save_png(PUBLIC / "og-brand.png", landscape)
    save_png(PUBLIC / "og-image.png", landscape)
    save_jpg(PUBLIC / "og-social.jpg", landscape)
    save_jpg(PUBLIC / "og-kakao.jpg", square)

    for name in ("favicon.svg", "brand-icon.svg", "app-icon.svg"):
        write_svg(PUBLIC / name)

    print(f"[OK] Brand assets generated in {PUBLIC}")
    print(f"     OG (Kakao): {SITE_ORIGIN}/og-kakao.jpg")


if __name__ == "__main__":
    main()
