"""Generate a small playable MP4 for tests (requires ffmpeg)."""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path


def write_test_video(dest: Path) -> bool:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return False

    dest.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [
            ffmpeg,
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=red:s=320x568:d=1",
            "-pix_fmt",
            "yuv420p",
            "-c:v",
            "libx264",
            "-movflags",
            "+faststart",
            str(dest),
        ],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0 and dest.exists() and dest.stat().st_size > 1024


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("../e2e/fixtures/test-video.mp4")
    ok = write_test_video(target.resolve())
    if not ok:
        print("ffmpeg not available — test video not generated", file=sys.stderr)
        sys.exit(1)
    print(f"Wrote {target}")
