import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const SOURCE = join(import.meta.dirname, '..', 'api.json');
const OUTPUT_DIR = join(import.meta.dirname, '..', 'docs');
const INDEX_FILE = 'index.json';
const CNAME_FILE = 'CNAME';

const ALLOWED_NPM = new Set([
  '@ai-sdk/openai-compatible',
  '@ai-sdk/anthropic',
  '@ai-sdk/openai',
  '@ai-sdk/google',
  '@openrouter/ai-sdk-provider',
  '@ai-sdk/xai',
  '@ai-sdk/mistral',
]);

const api = JSON.parse(readFileSync(SOURCE, 'utf8'));

const kept = Object.entries(api).filter(
  ([, provider]) => typeof provider?.npm === 'string' && ALLOWED_NPM.has(provider.npm),
);

mkdirSync(OUTPUT_DIR, { recursive: true });

const index = {
  last_updated: new Date().toISOString(),
  source: 'https://models.dev/api.json',
  provider_count: kept.length,
  providers: kept.map(([id, provider]) => ({
    id,
    name: provider.name,
    npm: provider.npm,
    ...(provider.api ? { api: provider.api } : {}),
    model_count: provider.models ? Object.keys(provider.models).length : 0,
  })),
};

const written = [];
let failed = false;

for (const [id, provider] of kept) {
  const payload = JSON.stringify(provider);
  const dir = join(OUTPUT_DIR, id);
  mkdirSync(dir, { recursive: true });
  if (writeIfChanged(join(OUTPUT_DIR, `${id}.json`), payload)) written.push(`${id}.json`);
  if (writeIfChanged(join(dir, INDEX_FILE), payload)) written.push(`${id}/index.json`);
}

const keptIds = new Set(kept.map(([id]) => id));

const stale = [];
for (const entry of readdirSync(OUTPUT_DIR, { withFileTypes: true })) {
  const { name } = entry;
  if (
    entry.isFile() &&
    name.endsWith('.json') &&
    name !== INDEX_FILE &&
    !keptIds.has(name.slice(0, -5))
  ) {
    stale.push(name);
  } else if (entry.isDirectory() && !keptIds.has(name)) {
    stale.push(`${name}/`);
  }
}

for (const name of stale) {
  try {
    rmSync(join(OUTPUT_DIR, name), { recursive: true, force: true });
  } catch (err) {
    console.error(`failed to remove ${name}:`, err.message);
    failed = true;
  }
}

writeIfChanged(join(OUTPUT_DIR, INDEX_FILE), JSON.stringify(index));

const cnameSource = join(import.meta.dirname, '..', CNAME_FILE);
const cnameTarget = join(OUTPUT_DIR, CNAME_FILE);
let cname = existsSync(cnameSource) ? readFileSync(cnameSource, 'utf8') : '';
if (!cname.trim() && existsSync(cnameTarget)) cname = readFileSync(cnameTarget, 'utf8');
if (cname.trim()) writeIfChanged(cnameTarget, cname);

const sizes = kept
  .map(([id]) => [id, join(OUTPUT_DIR, `${id}.json`)])
  .map(([id, file]) => [id, Math.round(fileSize(file) / 1024)]);

console.log(`providers kept: ${kept.length}`);
console.log(`files written: ${written.length}`);
console.log(`stale files removed: ${stale.length}`);
console.log('largest per-provider files (KB):');
console.table(sizes.sort((a, b) => b[1] - a[1]).slice(0, 10));

if (failed) process.exitCode = 1;

function writeIfChanged(file, payload) {
  try {
    if (readFileSync(file, 'utf8') === payload) return false;
  } catch {
    /* new file */
  }
  writeFileSync(file, payload);
  return true;
}

function fileSize(file) {
  try {
    return readFileSync(file).length;
  } catch {
    return 0;
  }
}