import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const exePath = path.join(root, 'dist', 'win-unpacked', 'Google Search Console Updater.exe');

const build = spawnSync('npx', ['electron-builder', '--win', 'dir', '--x64'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    CSC_IDENTITY_AUTO_DISCOVERY: 'false',
  },
});

if (!fs.existsSync(exePath)) {
  process.exit(build.status ?? 1);
}

const icon = spawnSync('node', ['scripts/apply-win-icon.mjs'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

if (icon.status !== 0) {
  process.exit(icon.status ?? 1);
}

const release = spawnSync('node', ['scripts/package-win-release.mjs'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

process.exit(release.status ?? 0);
