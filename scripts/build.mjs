import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = join(import.meta.dirname, '..', 'api.json');
const OUTPUT_DIR = join(import.meta.dirname, '..');
const INDEX_FILE = 'index.json';

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

const index = {
  last_updated: new Date().toISOString(),
  source: 'https://models.dev/api.json',
  provider_count: kept.length,
  providers: [],
};

const written = [];
let failed = false;

index.providers = kept.map(([id, provider]) => ({
  id,
  name: provider.name,
  npm: provider.npm,
  model_count: provider.models ? Object.keys(provider.models).length : 0,
}));

for (const [id, provider] of kept) {
  const payload = JSON.stringify(provider);
  const file = join(OUTPUT_DIR, `${id}.json`);
  try {
    const existing = readFileSync(file, 'utf8');
    if (existing === payload) continue;
  } catch {
    /* new file */
  }
  writeFileSync(file, payload);
  written.push(id);
}

const keptIds = new Set(kept.map(([id]) => id));
const stale = readdirSync(OUTPUT_DIR)
  .filter(
    (f) =>
      f.endsWith('.json') &&
      f !== INDEX_FILE &&
      f !== 'api.json' &&
      !keptIds.has(f.slice(0, -5)),
  )
  .map((f) => f.slice(0, -5));

for (const id of stale) {
  try {
    unlinkSync(join(OUTPUT_DIR, `${id}.json`));
  } catch (err) {
    console.error(`failed to remove ${id}.json:`, err.message);
    failed = true;
  }
}

const indexPayload = JSON.stringify(index);
try {
  const existing = readFileSync(join(OUTPUT_DIR, INDEX_FILE), 'utf8');
  if (existing !== indexPayload) writeFileSync(join(OUTPUT_DIR, INDEX_FILE), indexPayload);
} catch {
  writeFileSync(join(OUTPUT_DIR, INDEX_FILE), indexPayload);
}

const sizes = kept
  .map(([id, provider]) => [id, join(OUTPUT_DIR, `${id}.json`)])
  .map(([id, file]) => [id, Math.round(fileSize(file) / 1024)]);

console.log(`providers kept: ${kept.length}`);
console.log(`files written: ${written.length}`);
console.log(`stale files removed: ${stale.length}`);
console.log('largest per-provider files (KB):');
console.table(sizes.sort((a, b) => b[1] - a[1]).slice(0, 10));

if (failed) process.exitCode = 1;

function fileSize(file) {
  try {
    return readFileSync(file).length;
  } catch {
    return 0;
  }
}