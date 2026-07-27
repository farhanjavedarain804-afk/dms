// scripts/copy-server-deps.mjs
// Copies mysql2 (and its dependencies) into .output/server/node_modules
// so the server can find it at runtime on hosts without node_modules access.

import { cpSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const OUT = join(ROOT, '.output', 'server', 'node_modules');

const PACKAGES = [
  'mysql2',
  'aws-ssl-profiles',
  'denque',
  'generate-function',
  'iconv-lite',
  'long',
  'lru.min',
  'lru-cache',
  'named-placeholders',
  'seq-queue',
  'sql-escaper',
  'sqlstring',
];

mkdirSync(OUT, { recursive: true });

for (const pkg of PACKAGES) {
  const src = join(ROOT, 'node_modules', pkg);
  const dest = join(OUT, pkg);
  if (existsSync(src) && !existsSync(dest)) {
    console.log(`Copying ${pkg} -> .output/server/node_modules/${pkg}`);
    cpSync(src, dest, { recursive: true });
  }
}

console.log('Server deps copy complete.');
