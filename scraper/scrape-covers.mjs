/**
 * Download each travel document's cover image from its Wikipedia passport
 * page (infobox image / og:image) into public/covers/, and write
 * public/data/covers.json mapping docId → filename. Re-run
 * `npm run build:entities` afterwards so entities.json picks the covers up.
 *
 * Same politeness rules as scrape.mjs. Existing covers are kept unless
 * SCRAPE_COVERS_FORCE=1. Cover images on Wikipedia are typically public
 * domain or fair-use document covers; covers.json records the source page.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as cheerio from 'cheerio';
import { buildEntities } from '../tools/registry.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const coversDir = join(root, 'public/covers');
const mapPath = join(root, 'public/data/covers.json');
mkdirSync(coversDir, { recursive: true });

const USER_AGENT =
  'PassportMapBot/0.1 (https://github.com/guccamole/passportmap; passport cover fetch, ~monthly)';
const BASE_DELAY = Number(process.env.SCRAPE_DELAY ?? 12);
const FORCE = process.env.SCRAPE_COVERS_FORCE === '1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const covers = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')) : {};
const docs = buildEntities().flatMap((e) => e.documents);
const only = process.argv.slice(2);

let ok = 0, skipped = 0, failed = 0;
for (const [i, doc] of docs.entries()) {
  if (only.length && !only.includes(doc.id)) continue;
  if (covers[doc.id] && existsSync(join(coversDir, covers[doc.id])) && !FORCE) { skipped++; continue; }
  try {
    const pageRes = await fetch(`https://en.wikipedia.org/wiki/${doc.passportPage}`, {
      headers: { 'user-agent': USER_AGENT }, redirect: 'follow',
    });
    if (!pageRes.ok) throw new Error(`page ${pageRes.status}`);
    const $ = cheerio.load(await pageRes.text());
    // Prefer the infobox image (the physical booklet); fall back to og:image.
    let src = $('table.infobox img').first().attr('src')
      ?? $('meta[property="og:image"]').attr('content');
    if (!src) throw new Error('no image found');
    if (src.startsWith('//')) src = `https:${src}`;
    // request a reasonably sized thumb instead of the 60px infobox thumb
    src = src.replace(/\/(\d+)px-/, '/440px-');
    const imgRes = await fetch(src, { headers: { 'user-agent': USER_AGENT } });
    if (!imgRes.ok) throw new Error(`image ${imgRes.status}`);
    const ext = (src.match(/\.(png|jpe?g|webp|gif)(?:$|\?)/i)?.[1] ?? 'jpg').toLowerCase();
    const file = `${doc.id}.${ext}`;
    writeFileSync(join(coversDir, file), Buffer.from(await imgRes.arrayBuffer()));
    covers[doc.id] = file;
    writeFileSync(mapPath, JSON.stringify(covers, null, 1));
    console.log(`  [${i + 1}/${docs.length}] ${doc.id} ✓ ${file}`);
    ok++;
  } catch (err) {
    console.warn(`  [${i + 1}/${docs.length}] ${doc.id}: ${err.message} (placeholder cover will be shown)`);
    failed++;
  }
  await sleep(BASE_DELAY * (0.5 + Math.random()) * 1000);
}
console.log(`covers: ${ok} downloaded, ${skipped} kept, ${failed} unavailable`);
console.log('now run: npm run build:entities');
