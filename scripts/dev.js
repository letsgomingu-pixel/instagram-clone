import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { setup, backend, frontend, isWin, venvPython } from './setup.js';

function killUvicornProcesses() {
  try {
    if (isWin) {
      const ps =
        "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | " +
        "Where-Object { $_.CommandLine -match 'uvicorn app.main|multiprocessing-fork' } | " +
        "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
      execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: 'ignore' });
      return;
    }

    execSync("pkill -f 'uvicorn app.main' || true", { stdio: 'ignore' });
  } catch {
    // No matching processes.
  }
}

function killPortListeners(port) {
  try {
    if (isWin) {
      const ps = `[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false); Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique`;
      const output = execSync(`powershell -NoProfile -Command "${ps}"`, { encoding: 'utf8' });
      for (const pid of output.split('\n').map((line) => line.trim()).filter(Boolean)) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch {
          // Process may already be gone.
        }
      }
      return;
    }

    execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
  } catch {
    // Port is free or tooling unavailable.
  }
}

function getPython() {
  const python = venvPython();
  if (!existsSync(python) || !existsSync(join(frontend, 'node_modules'))) {
    return setup();
  }
  return python;
}

const BACKEND_PORT = 8001;

const python = getPython();

killUvicornProcesses();
killPortListeners(8000);
killPortListeners(BACKEND_PORT);
killPortListeners(5173);

console.log('🚀 서버 시작 중...\n');
console.log('   프론트엔드 → http://127.0.0.1:5173');
console.log(`   백엔드 API → http://localhost:${BACKEND_PORT}`);
console.log(`   Swagger    → http://localhost:${BACKEND_PORT}/docs`);
console.log('\n   종료: Ctrl + C\n');

const backendProc = spawn(
  python,
  ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '127.0.0.1', '--port', String(BACKEND_PORT)],
  {
  cwd: backend,
  stdio: 'inherit',
  shell: false,
  windowsHide: true,
});

const viteBin = join(frontend, 'node_modules', 'vite', 'bin', 'vite.js');
if (!existsSync(viteBin)) {
  console.error('❌ Vite를 찾을 수 없습니다. npm run setup 을 먼저 실행해주세요.');
  process.exit(1);
}

const frontendProc = spawn(process.execPath, [viteBin], {
  cwd: frontend,
  stdio: 'inherit',
  shell: false,
  windowsHide: true,
});

let shuttingDown = false;

function cleanup() {
  shuttingDown = true;
  backendProc.kill();
  frontendProc.kill();
  killUvicornProcesses();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

const url = 'http://127.0.0.1:5173';
let opened = false;

async function waitAndOpen() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(url);
      if (res.ok && !opened) {
        opened = true;
        if (isWin) {
          spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
        } else if (process.platform === 'darwin') {
          spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
        } else {
          spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
        }
        console.log(`🌐 브라우저 열림: ${url}\n`);
        return;
      }
    } catch {
      // not ready
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

waitAndOpen();

backendProc.on('exit', (code) => {
  if (shuttingDown) return;
  console.error(`\n❌ 백엔드가 종료되었습니다 (code=${code}). npm run dev 를 다시 실행하세요.\n`);
  cleanup();
});

frontendProc.on('exit', (code) => {
  if (shuttingDown) return;
  console.error(`\n❌ Vite(프론트엔드)가 종료되었습니다 (code=${code}). ERR_CONNECTION_REFUSED 가 발생할 수 있습니다.\n`);
  console.error('   → npm run dev 를 다시 실행하세요.\n');
  backendProc.kill();
  process.exit(code || 1);
});
