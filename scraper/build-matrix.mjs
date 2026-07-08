/**
 * Merge data/access/<docId>.json files (scraped or seeded) into the single
 * compact file the frontend loads: public/data/matrix.json
 *
 * Manual corrections live in data/overrides/<docId>.json — same `access`
 * shape — and are applied last, on top of scraped data. Use them for facts
 * Wikipedia gets wrong or edge cases the scraper can't parse (e.g. the
 * Teudat Ma'avar rows, SMOM acceptance list).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const accessDir = join(root, 'data/access');
const overridesDir = join(root, 'data/overrides');

const documents = {};
const meta = { sources: {}, builtAt: new Date().toISOString(), anyReal: false, anySeed: false };

for (const f of readdirSync(accessDir).filter((f) => f.endsWith('.json')).sort()) {
  const d = JSON.parse(readFileSync(join(accessDir, f), 'utf8'));
  documents[d.document] = d.access;
  meta.sources[d.document] = { source: d.source, at: d.scrapedAt ?? d.generatedAt, url: d.url };
  if (d.source === 'wikipedia') meta.anyReal = true;
  if (d.source === 'seed') meta.anySeed = true;
}

if (existsSync(overridesDir)) {
  for (const f of readdirSync(overridesDir).filter((f) => f.endsWith('.json')).sort()) {
    const d = JSON.parse(readFileSync(join(overridesDir, f), 'utf8'));
    const id = d.document ?? f.replace(/\.json$/, '');
    documents[id] = { ...(documents[id] ?? {}), ...d.access };
    (meta.sources[id] ??= {}).overridden = true;
  }
}

mkdirSync(join(root, 'public/data'), { recursive: true });
writeFileSync(join(root, 'public/data/matrix.json'), JSON.stringify({ meta, documents }));
const n = Object.keys(documents).length;
console.log(`matrix.json: ${n} documents, ${Object.values(documents).reduce((s, a) => s + Object.keys(a).length, 0)} pairs`);
