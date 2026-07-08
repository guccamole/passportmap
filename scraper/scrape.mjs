/**
 * Scrape visa-requirement tables from Wikipedia for every document in the
 * registry, one page at a time with randomized delays.
 *
 *   node scraper/scrape.mjs                 # all documents, polite & slow
 *   node scraper/scrape.mjs AUS ISR-darkon  # only these documents
 *   SCRAPE_DELAY=20 node scraper/scrape.mjs # base delay (s) between pages
 *   SCRAPE_MAX_AGE_DAYS=25 …                # skip files fresher than this
 *
 * Politeness: pages are fetched sequentially, at BASE_DELAY × (0.5 + rand)
 * second intervals (default ≈ 8–24 s), with a descriptive User-Agent per
 * Wikipedia's robot policy (https://w.wiki/4wJS). ~200 pages ≈ 1 hour.
 * Wikipedia's content is CC BY-SA; we store the source URL + timestamp per
 * document.
 *
 * Output: data/access/<docId>.json with source:"wikipedia" (never touched by
 * the demo seeder afterwards). Run `npm run build:matrix` after scraping.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as cheerio from 'cheerio';
import { buildEntities } from '../tools/registry.mjs';
import { normalizeStatus, parseDays, encode } from './statuses.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(root, 'data/access');
mkdirSync(outDir, { recursive: true });

const USER_AGENT =
  'PassportMapBot/0.1 (https://github.com/guccamole/passportmap; data refresh, ~monthly)';
const BASE_DELAY = Number(process.env.SCRAPE_DELAY ?? 16); // seconds
const MAX_AGE_DAYS = Number(process.env.SCRAPE_MAX_AGE_DAYS ?? 0); // 0 = always rescrape

const entities = buildEntities();
const nameToId = new Map();
for (const e of entities) {
  nameToId.set(e.name.toLowerCase(), e.id);
  for (const f of e.features) nameToId.set(f.toLowerCase(), e.id);
}
// common Wikipedia table names that differ from ours
const ALIASES = {
  'united states': 'USA', 'united states of america': 'USA',
  'china': 'CHN', "people's republic of china": 'CHN', 'mainland china': 'CHN',
  'hong kong': 'HKG', 'macau': 'MAC', 'macao': 'MAC',
  'taiwan': 'TWN', 'republic of china': 'TWN',
  'democratic republic of the congo': 'COD', 'dr congo': 'COD',
  'republic of the congo': 'COG', 'congo': 'COG',
  'ivory coast': 'CIV', "côte d'ivoire": 'CIV',
  'cape verde': 'CPV', 'east timor': 'TLS', 'timor-leste': 'TLS',
  'myanmar': 'MMR', 'burma': 'MMR', 'eswatini': 'SWZ', 'swaziland': 'SWZ',
  'vatican city': 'VAT', 'holy see': 'VAT', 'north macedonia': 'MKD',
  'south korea': 'KOR', 'north korea': 'PRK', 'russia': 'RUS',
  'palestinian territories': 'PSE', 'palestine': 'PSE',
  'são tomé and príncipe': 'STP', 'sao tome and principe': 'STP',
  'the gambia': 'GMB', 'the bahamas': 'BHS', 'micronesia': 'FSM',
  'federated states of micronesia': 'FSM', 'czech republic': 'CZE',
  'turkey': 'TUR', 'türkiye': 'TUR', 'northern cyprus': 'NCY',
  'united kingdom': 'GBR', 'somaliland': 'SOL', 'western sahara': 'ESH',
  'kosovo': 'XKX', 'georgia': 'GEO',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitteredDelay = () => BASE_DELAY * (0.5 + Math.random()) * 1000;

async function fetchPage(page) {
  const url = `https://en.wikipedia.org/wiki/${page}`;
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT }, redirect: 'follow' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return { html: await res.text(), url: res.url };
}

function destIdFor(cellText) {
  const t = cellText.toLowerCase().replace(/\[.*?\]/g, '').trim();
  return nameToId.get(t) ?? ALIASES[t] ?? null;
}

/** Parse the big sortable "visa requirements" table(s) on a page. */
function parseAccess($) {
  const access = {};
  $('table.wikitable').each((_, table) => {
    const headers = $(table).find('tr').first().find('th')
      .map((_, th) => $(th).text().toLowerCase().trim()).get();
    const countryCol = headers.findIndex((h) => /country|territory|region/.test(h));
    const statusCol = headers.findIndex((h) => /visa requirement|requirement|status/.test(h));
    const stayCol = headers.findIndex((h) => /allowed stay|duration|stay/.test(h));
    const notesCol = headers.findIndex((h) => /notes/.test(h));
    if (countryCol === -1 || statusCol === -1) return;

    $(table).find('tr').slice(1).each((_, tr) => {
      const cells = $(tr).find('th,td');
      if (cells.length <= statusCol) return;
      const destId = destIdFor($(cells[countryCol]).text());
      if (!destId) return;
      const statusText = $(cells[statusCol]).text();
      const code = normalizeStatus(statusText);
      const days = stayCol !== -1 ? parseDays($(cells[stayCol]).text()) : parseDays(statusText);
      let note = notesCol !== -1
        ? $(cells[notesCol]).text().replace(/\[.*?\]/g, '').trim().slice(0, 200)
        : '';
      if (!access[destId]) access[destId] = encode(code, days, note || undefined);
    });
  });
  return access;
}

const only = process.argv.slice(2);
const docs = entities.flatMap((e) => e.documents.map((d) => ({ entity: e, doc: d })))
  .filter(({ doc }) => only.length === 0 || only.includes(doc.id) || only.includes(doc.id.split('-')[0]));

console.log(`Scraping ${docs.length} documents (base delay ${BASE_DELAY}s ± jitter)…`);
let ok = 0, missing = 0, failed = 0, fresh = 0;

for (const [i, { entity, doc }] of docs.entries()) {
  const outPath = join(outDir, `${doc.id}.json`);
  if (MAX_AGE_DAYS > 0 && existsSync(outPath)) {
    const prev = JSON.parse(readFileSync(outPath, 'utf8'));
    const age = (Date.now() - statSync(outPath).mtimeMs) / 86400000;
    if (prev.source === 'wikipedia' && age < MAX_AGE_DAYS) { fresh++; continue; }
  }
  try {
    const res = await fetchPage(doc.visaPage);
    if (!res) {
      console.warn(`  [${i + 1}/${docs.length}] ${doc.id}: page not found (${doc.visaPage}) — keeping existing data`);
      missing++;
    } else {
      const $ = cheerio.load(res.html);
      const access = parseAccess($);
      const n = Object.keys(access).length;
      if (n < 50 && entity.recognition === 'full') {
        console.warn(`  [${i + 1}/${docs.length}] ${doc.id}: only ${n} rows parsed — check ${res.url}; keeping existing data`);
        failed++;
      } else {
        // self is never in the table
        access[entity.id] = encode('na');
        writeFileSync(outPath, JSON.stringify({
          document: doc.id, source: 'wikipedia', url: res.url,
          scrapedAt: new Date().toISOString(), access,
        }, null, 0));
        console.log(`  [${i + 1}/${docs.length}] ${doc.id}: ${n} destinations ✓`);
        ok++;
      }
    }
  } catch (err) {
    console.error(`  [${i + 1}/${docs.length}] ${doc.id}: ${err.message}`);
    failed++;
  }
  if (i < docs.length - 1) await sleep(jitteredDelay());
}

console.log(`done: ${ok} scraped, ${fresh} fresh (skipped), ${missing} pages missing, ${failed} failed`);
console.log('now run: npm run build:matrix');
if (failed > docs.length / 4) process.exit(1);
