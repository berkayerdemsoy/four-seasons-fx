"""Encodes frames from scripts/capture.mjs into README assets (needs Pillow: pip install pillow).

assets/preview/<season>.webp  animated, loops
assets/preview/<season>.png   still frame, for places that do not animate WebP
assets/social-preview.png     1280 x 640, upload in GitHub repo settings > Social preview
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FRAMES = ROOT / "scripts" / ".frames"
OUT = ROOT / "assets" / "preview"
FPS = 20


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for season in ("winter", "spring", "summer", "autumn"):
        paths = sorted((FRAMES / season).glob("*.png"))
        if not paths:
            raise SystemExit(f"No frames for {season}; run scripts/capture.mjs first")
        frames = [Image.open(p).convert("RGB") for p in paths]
        target = OUT / f"{season}.webp"
        frames[0].save(
            target,
            save_all=True,
            append_images=frames[1:],
            duration=round(1000 / FPS),
            loop=0,
            quality=70,
            method=6,
        )
        frames[len(frames) // 2].save(OUT / f"{season}.png", optimize=True)
        print(f"{target.relative_to(ROOT)}  {target.stat().st_size / 1024:.0f} KB")

    social = sorted((FRAMES / "social").glob("*.png"))
    if social:
        target = ROOT / "assets" / "social-preview.png"
        Image.open(social[0]).convert("RGB").save(target, optimize=True)
        print(f"{target.relative_to(ROOT)}  {target.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
