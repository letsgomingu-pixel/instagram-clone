import { spawnSync } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const backend = join(root, 'backend');
export const frontend = join(root, 'frontend');

export const isWin = process.platform === 'win32';

export function run(cmd, args, cwd = root) {
  if (isWin && cmd === 'npm') {
    const result = spawnSync(`npm ${args.join(' ')}`, {
      cwd,
      stdio: 'inherit',
      shell: true,
      windowsHide: true,
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
    return result;
  }

  const result = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result;
}

export function venvPython() {
  return isWin
    ? join(backend, 'venv', 'Scripts', 'python.exe')
    : join(backend, 'venv', 'bin', 'python');
}

export function findPython() {
  for (const cmd of ['python', 'python3', 'py']) {
    const args = cmd === 'py' ? ['-3', '--version'] : ['--version'];
    const result = spawnSync(cmd, args, { shell: false, stdio: 'pipe', windowsHide: true });
    if (result.status === 0) return cmd;
  }
  console.error('\n❌ Python이 설치되어 있지 않습니다.');
  console.error('   https://python.org 에서 Python 3.11+ 설치 후 다시 시도해주세요.\n');
  process.exit(1);
}

export function checkNode() {
  const result = spawnSync('node', ['--version'], { shell: false, stdio: 'pipe', windowsHide: true });
  if (result.status !== 0) {
    console.error('\n❌ Node.js가 설치되어 있지 않습니다.');
    console.error('   https://nodejs.org 에서 Node.js 18+ 설치 후 다시 시도해주세요.\n');
    process.exit(1);
  }
}

export function setup() {
  console.log('🔍 환경 확인 중...');
  checkNode();
  const pythonCmd = findPython();

  const python = venvPython();

  if (!existsSync(python)) {
    console.log('\n📦 Python 가상환경 생성 중...');
    const venvArgs = pythonCmd === 'py' ? ['-3', '-m', 'venv', 'venv'] : ['-m', 'venv', 'venv'];
    run(pythonCmd, venvArgs, backend);
  }

  console.log('📦 백엔드 패키지 설치 중...');
  run(python, ['-m', 'pip', 'install', '-r', 'requirements.txt'], backend);

  const envFile = join(backend, '.env');
  if (!existsSync(envFile)) {
    copyFileSync(join(backend, '.env.example'), envFile);
    console.log('✅ backend/.env 생성됨');
  }

  console.log('📦 프론트엔드 패키지 설치 중...');
  run('npm', ['install'], frontend);

  console.log('✅ 모든 패키지 설치 완료!\n');
  return python;
}

if (process.argv[1]?.endsWith('setup.js')) {
  setup();
}
