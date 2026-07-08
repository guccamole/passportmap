/**
 * Emit public/data/entities.json — the entity/document registry the frontend
 * loads. Derived entirely from tools/registry.mjs.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildEntities, BLOCS } from './registry.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const entities = buildEntities();

// If the cover scraper has run, map document ids to downloaded cover files.
const coversPath = join(root, 'public/data/covers.json');
const covers = existsSync(coversPath) ? JSON.parse(readFileSync(coversPath, 'utf8')) : {};

for (const e of entities) {
  for (const d of e.documents) {
    d.wikipediaVisaUrl = `https://en.wikipedia.org/wiki/${d.visaPage}`;
    d.wikipediaPassportUrl = `https://en.wikipedia.org/wiki/${d.passportPage}`;
    if (covers[d.id]) d.cover = covers[d.id];
  }
}

mkdirSync(join(root, 'public/data'), { recursive: true });
writeFileSync(
  join(root, 'public/data/entities.json'),
  JSON.stringify({ blocs: BLOCS, entities }, null, 1),
);
console.log(`entities.json: ${entities.length} entities, ${entities.reduce((n, e) => n + e.documents.length, 0)} documents`);
