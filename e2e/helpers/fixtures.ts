import path from 'node:path';
import { fileURLToPath } from 'node:url';

const e2eRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const TEST_IMAGE_PATH = path.join(e2eRoot, 'fixtures', 'test-image.jpg');
export const TEST_VIDEO_PATH = path.join(e2eRoot, 'fixtures', 'test-video.mp4');
