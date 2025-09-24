/* eslint-disable no-console */
// Self-building start for hosts that only allow `npm start` and no dev mode.
const { spawnSync } = require('child_process');
const { existsSync } = require('fs');

function run(cmd, args, opts) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
}

// 1) Ensure deps
try {
  if (!existsSync('node_modules')) {
    console.log('[start] Installing dependencies (ci)...');
    run('npm', ['ci']);
  }
} catch {
  console.log('[start] npm ci failed or not applicable, trying npm install...');
  run('npm', ['install', '--no-audit', '--no-fund']);
}

// 2) Build if needed
if (!existsSync('.next') || !existsSync('.next/BUILD_ID')) {
  console.log('[start] Building Next.js app...');
  run('npm', ['run', 'build']);
}

// 3) Start production server
console.log('[start] Starting Next.js on port', process.env.PORT || '3000');
run('next', ['start', '-p', process.env.PORT || '3000']);

