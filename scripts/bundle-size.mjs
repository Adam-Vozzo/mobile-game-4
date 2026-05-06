// Reports the gzipped size of the production build's JS+CSS.
// Used in CI to track regressions; threshold is currently soft.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const TARGET_BYTES = 500 * 1024; // 500 KB gzipped soft target

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let total = 0;
const entries = [];
for (const file of walk(DIST)) {
  if (!/\.(?:js|css|html)$/.test(file)) continue;
  const buf = readFileSync(file);
  const gz = gzipSync(buf).length;
  total += gz;
  entries.push({ file, raw: buf.length, gz });
}

entries.sort((a, b) => b.gz - a.gz);
for (const e of entries) {
  console.log(`${pad(e.gz, 8)}  ${pad(e.raw, 8)}  ${e.file}`);
}
console.log('-'.repeat(60));
console.log(`${pad(total, 8)} total gz`);
console.log(`target ${TARGET_BYTES} (${(TARGET_BYTES / 1024).toFixed(0)} KB)`);

if (total > TARGET_BYTES) {
  console.warn(`bundle exceeds ${TARGET_BYTES} bytes gzipped`);
  // Currently a soft warning. Wire as failure once the actual size stabilises.
}

function pad(n, w) {
  return String(n).padStart(w);
}
