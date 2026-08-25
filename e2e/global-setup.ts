import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default async function globalSetup() {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const isWin = process.platform === 'win32';
  const python = isWin
    ? path.join(root, 'backend', 'venv', 'Scripts', 'python.exe')
    : path.join(root, 'backend', 'venv', 'bin', 'python');

  execSync(`"${python}" scripts/migrate.py reset --seed`, {
    cwd: path.join(root, 'backend'),
    stdio: 'inherit',
  });

  const fixturesDir = path.join(root, 'e2e', 'fixtures');
  fs.mkdirSync(fixturesDir, { recursive: true });
  const imagePath = path.join(fixturesDir, 'test-image.jpg');
  execSync(
    `"${python}" -c "from PIL import Image; Image.new('RGB', (100, 100), 'red').save(r'${imagePath.replace(/\\/g, '\\\\')}')"`,
    { cwd: root, stdio: 'inherit' },
  );

  const videoPath = path.join(fixturesDir, 'test-video.mp4');
  try {
    execSync(`"${python}" scripts/make_test_video.py "${videoPath}"`, {
      cwd: path.join(root, 'backend'),
      stdio: 'inherit',
    });
  } catch {
    console.warn('[e2e] ffmpeg unavailable — video story E2E may be skipped');
  }
}
