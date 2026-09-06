"""Generate favicon / PWA / OG assets from the official brand icon master."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
MASTER = PUBLIC / "brand-icon-master.png"

BRAND_BLACK = "#000000"


def load_master() -> Image.Image:
    if not MASTER.exists():
        raise FileNotFoundError(
            f"Missing {MASTER}. Place the official brand icon PNG at this path before running."
        )
    return Image.open(MASTER).convert("RGBA")


def save_png(path: Path, image: Image.Image) -> None:
    image.save(path, format="PNG", optimize=True)


def save_ico(path: Path, master: Image.Image) -> None:
    sizes = [16, 32, 48]
    frames = [master.resize((s, s), Image.Resampling.LANCZOS) for s in sizes]
    frames[-1].save(path, format="ICO", sizes=[(s, s) for s in sizes])


def render_og(master: Image.Image) -> Image.Image:
    canvas_w, canvas_h = 1200, 630
    og = Image.new("RGBA", (canvas_w, canvas_h), BRAND_BLACK)

    max_w = int(canvas_w * 0.86)
    max_h = int(canvas_h * 0.62)
    ratio = min(max_w / master.width, max_h / master.height)
    new_size = (max(1, int(master.width * ratio)), max(1, int(master.height * ratio)))
    resized = master.resize(new_size, Image.Resampling.LANCZOS)

    x = (canvas_w - new_size[0]) // 2
    y = (canvas_h - new_size[1]) // 2
    og.paste(resized, (x, y), resized)
    return og.convert("RGB")


def write_svg(path: Path) -> None:
    path.write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" fill="#000000"/>
  <text
    x="256"
    y="268"
    text-anchor="middle"
    font-family="Georgia, 'DM Serif Display', serif"
    font-size="38"
    fill="#0095FF"
  >i am not a fishmonger</text>
</svg>
""",
        encoding="utf-8",
    )


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    master = load_master()

    outputs = {
        16: "favicon-16x16.png",
        32: "favicon-32x32.png",
        180: "apple-touch-icon.png",
        192: "icon-192.png",
        512: "icon-512.png",
    }

    for size, name in outputs.items():
        save_png(PUBLIC / name, master.resize((size, size), Image.Resampling.LANCZOS))

    save_ico(PUBLIC / "favicon.ico", master)
    save_png(PUBLIC / "og-image.png", render_og(master))

    for name in ("favicon.svg", "brand-icon.svg", "app-icon.svg"):
        write_svg(PUBLIC / name)

    print(f"[OK] Brand assets generated in {PUBLIC}")


if __name__ == "__main__":
    main()
