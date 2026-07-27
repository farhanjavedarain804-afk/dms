// scripts/copy-server-deps.mjs
// Installs mysql2 directly into .output/server so Hostinger has all required runtime deps.

import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const ROOT = process.cwd();
const SERVER_DIR = join(ROOT, '.output', 'server');

if (!existsSync(SERVER_DIR)) {
  mkdirSync(SERVER_DIR, { recursive: true });
}

console.log('Installing mysql2 in .output/server...');
execSync('npm install mysql2 --no-save', { cwd: SERVER_DIR, stdio: 'inherit' });
console.log('Server deps installed.');
