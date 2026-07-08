/**
 * Generate a clearly-labelled DEMO dataset so the app is fully explorable
 * before the real Wikipedia scrape has run.
 *
 * ⚠ The data written here is APPROXIMATE. It encodes coarse mobility tiers,
 * real freedom-of-movement blocs and a set of curated showcase pairs, and
 * every file is stamped `source: "seed"` / `approximate: true`. The frontend
 * shows a "demo data" banner until files produced by scraper/scrape.mjs
 * (stamped `source: "wikipedia"`) replace them. Files with
 * `source: "wikipedia"` are NEVER overwritten by this script.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildEntities, BLOCS } from '../tools/registry.mjs';
import { encode } from './statuses.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(root, 'data/access');
mkdirSync(outDir, { recursive: true });

const entities = buildEntities();
const ids = entities.map((e) => e.id);
const byId = new Map(entities.map((e) => [e.id, e]));

// ── coarse mobility tiers (origin side) ──────────────────────────────────
const T1 = new Set([...BLOCS.EU.members, ...BLOCS.EFTA.members,
  'GBR','USA','CAN','AUS','NZL','JPN','KOR','SGP','ARE','CHL','BRN','MYS','HKG','MCO','SMR','AND','VAT']);
const T2 = new Set(['ARG','BRA','MEX','URY','PRY','PAN','CRI','TWN','MAC','ISR','MUS','SYC','BHS','BRB',
  'KNA','ATG','LCA','VCT','TTO','GRD','DMA','QAT','KWT','BHR','SAU','OMN','TUR','UKR','MDA','GEO',
  'MKD','MNE','SRB','ALB','BIH','PER','COL','SLV','GTM','HND','NIC','ZAF','BWA','RUS','KAZ','PLW','WSM','TON','FSM','MHL','KIR','TUV','SLB','VUT','FJI','NRU','PNG','TLS','THA','VEN','ECU','BOL','GUY','SUR','JAM','BLZ']);
const T4 = new Set(['AFG','IRQ','SYR','YEM','SOM','PAK','PRK','ERI','SDN','SSD','LBY','BGD','PSE','ESH']);
const tierOf = (id) => (T1.has(id) ? 1 : T2.has(id) ? 2 : T4.has(id) ? 4 : 3);

// documents whose origin behaves like a different tier than the entity default
const DOC_TIER = { 'ISR-teudat-maavar': 3 };

// ── freedom-of-movement membership ───────────────────────────────────────
const fomBlocs = Object.entries(BLOCS).filter(([, b]) => b.fom && !b.virtual);
const EUEFTA = new Set([...BLOCS.EU.members, ...BLOCS.EFTA.members]);
function fomBetween(a, b) {
  if (EUEFTA.has(a) && EUEFTA.has(b)) return 'EU/EEA/Switzerland free movement';
  for (const [, bloc] of fomBlocs) {
    if (bloc.members.includes(a) && bloc.members.includes(b)) return bloc.name;
  }
  return null;
}

// ── destination entry policies, as fn(originTier) → encoded status ───────
const SCHENGEN = new Set(BLOCS.SCHENGEN.members);
const GCC = new Set(BLOCS.GCC.members);
const POLICIES = {
  usa: (t) => (t === 1 ? encode('eta', 90, 'ESTA') : encode('vr')),
  can: (t) => (t === 1 ? encode('eta', 180, 'eTA') : encode('vr')),
  ukirl: (t) => (t === 1 ? encode('eta', 180) : t === 2 ? encode('vr') : encode('vr')),
  schengen: (t) => (t <= 2 ? encode('vf', 90, '90 days in any 180-day period (Schengen)') : encode('vr')),
  auznz: (t) => (t === 1 ? encode('eta', 90) : t === 2 ? encode('ev', 90) : encode('vr')),
  eastasia: (t) => (t <= 2 ? encode('vf', 90) : encode('vr')),
  gcc: (t) => (t === 1 ? encode('vf', 90) : t === 2 ? encode('ev', 30) : encode('vr')),
  ruschn: (t) => (t === 2 ? encode('vf', 90) : encode('vr')),
  georgia: (t) => (t <= 2 ? encode('vf', 365) : encode('vr')),
  open: (t) => (t <= 2 ? encode('vf', 90) : t === 3 ? encode('voa', 30) : encode('ev', 30)),
  voaBelt: (t) => (t <= 2 ? encode('voa', 30) : encode('voaev', 30)),
  standard: (t) => (t === 1 ? encode('vf', 90) : t === 2 ? encode('vf', 30) : t === 3 ? encode('ev', 30) : encode('vr')),
  closed: () => encode('vr'),
};
const DEST_CLASS = new Map();
const assign = (cls, list) => list.forEach((id) => DEST_CLASS.set(id, cls));
assign('usa', ['USA']);
assign('can', ['CAN']);
assign('ukirl', ['GBR', 'IRL']);
assign('schengen', [...SCHENGEN]);
assign('auznz', ['AUS', 'NZL']);
assign('eastasia', ['JPN','KOR','SGP','TWN','HKG','MAC','MYS','BRN','ISR','CHL','ARG','BRA','MEX','URY','PAN','CRI','ZAF','MUS']);
assign('gcc', [...GCC]);
assign('ruschn', ['RUS', 'CHN', 'BLR']);
assign('georgia', ['GEO', 'ARM']);
assign('open', ['THA','PHL','IDN','VNM','KAZ','KGZ','UZB','MNG','TUR','UKR','MDA','SRB','ALB','MKD','MNE','BIH','XKX','PER','COL','ECU','BOL','PRY','DOM','JAM','BHS','BRB','TTO','LCA','VCT','GRD','DMA','KNA','ATG','BLZ','GTM','SLV','HND','NIC','FJI','WSM','TON','VUT','PLW','FSM','MHL','KIR','TUV','NRU','SLB','PNG','BWA','NAM','SWZ','LSO','ZMB','ZWE','MWI','TZA','KEN','UGA','RWA','GMB','SEN','GHA','CPV','STP','SYC','MAR','TUN']);
assign('voaBelt', ['KHM','LAO','NPL','MDV','TLS','LKA','BGD','MMR','ETH','DJI','SOM','COM','MDG','MOZ','BDI','SLE','GIN','GNB','LBR','TGO','BEN','BFA','MLI','NER','NGA','CIV','CMR','GAB','COG','COD','CAF','TCD','AGO','MRT','EGY','JOR','LBN','IRQ','IRN','PAK','SUR','GUY','HTI','CUB','VEN']);
assign('closed', ['PRK','TKM','ERI','AFG','SYR','YEM','LBY','SDN','SSD','PSE','ESH','SOL','NCY','SMOM','BTN','DZA']);

// ── curated pair overrides: showcase examples & well-known edge cases ────
// [originDocId or entityId, destEntityId, encoded]
const OVERRIDES = [
  // The examples from the product spec
  ['MEX', 'ARE', encode('vf', 180, 'Mexican citizens receive an exceptional 180-day visa-free stay in the UAE')],
  ['IRL', 'ARE', encode('vf', 30)],
  // Neighbours & long stays
  ['CAN', 'USA', encode('vf', 180)],
  ['USA', 'CAN', encode('vf', 180)],
  ['USA', 'GEO', encode('vf', 365)],
  ['USA', 'ALB', encode('vf', 365)],
  ['USA', 'CHN', encode('twv', 10, 'Visa-free transit up to 240 hours at designated ports')],
  ['USA', 'PRK', encode('ban', null, 'US passports are invalid for travel to, in or through the DPRK without special validation')],
  ['USA', 'IRN', encode('vr', null, 'Guided-tour requirement')],
  ['GBR', 'USA', encode('eta', 90, 'ESTA')],
  ['AUS', 'USA', encode('eta', 90, 'ESTA')],
  ['NZL', 'AUS', encode('fom', null, 'Trans-Tasman: right to live and work')],
  ['AUS', 'NZL', encode('fom', null, 'Trans-Tasman: right to live and work')],
  ['SGP', 'CHN', encode('vf', 30)],
  ['JPN', 'CHN', encode('vf', 30)],
  ['RUS', 'GEO', encode('vf', 365)],
  ['RUS', 'TUR', encode('vf', 60)],
  ['TUR', 'NCY', encode('vf', 90)],
  ['CHN', 'TWN', encode('vr', null, 'Mainland residents require an Exit & Entry Permit issued by Taiwan')],
  ['TWN', 'CHN', encode('vr', null, 'Taiwan residents use the Mainland Travel Permit rather than a visa')],
  ['IND', 'NPL', encode('fom', null, 'Open border under the 1950 India–Nepal treaty')],
  ['NPL', 'IND', encode('fom', null, 'Open border under the 1950 India–Nepal treaty')],
];

// Israeli documents: states that do not admit Israeli document holders.
const ISR_BAN = ['DZA','IRN','IRQ','KWT','LBN','LBY','MYS','PAK','SAU','SYR','YEM'];
for (const d of ISR_BAN) {
  OVERRIDES.push(['ISR-darkon', d, encode('ban', null, 'Does not admit holders of Israeli travel documents')]);
  OVERRIDES.push(['ISR-teudat-maavar', d, encode('ban', null, 'Does not admit holders of Israeli travel documents')]);
}
// The Teudat Ma'avar enjoys notably fewer visa waivers than the Darkon.
for (const d of BLOCS.SCHENGEN.members) OVERRIDES.push(['ISR-teudat-maavar', d, encode('vr', null, "Schengen visa waiver applies to the Darkon, not the Teudat Ma'avar")]);
OVERRIDES.push(['ISR-teudat-maavar', 'GBR', encode('vr')]);
OVERRIDES.push(['ISR-teudat-maavar', 'USA', encode('vr')]);

// Northern Cyprus passport: recognised by Turkey; a few states accept it as
// a travel document; elsewhere it is not accepted.
const NCY_ACCEPT = { TUR: encode('vf', 90), GBR: encode('vr', null, 'Accepted as a travel document for visa issuance'), USA: encode('vr'), AUS: encode('vr'), FRA: encode('vr') };
// Somaliland passport: accepted by a handful of neighbours & partners.
const SOL_ACCEPT = { ETH: encode('voa', 30), DJI: encode('vr'), KEN: encode('ev', 90), ARE: encode('vr'), GBR: encode('vr'), TWN: encode('vr') };
// SMOM passport: no territory; accepted by a limited set of states.
const SMOM_ACCEPT = { ITA: encode('vf', 90, 'SMOM is headquartered in Rome with extraterritorial properties'), MLT: encode('vf', 90), AUT: encode('vf', 90), CHE: encode('vr'), FRA: encode('vr') };
const MINIMAL_DOCS = { NCY: NCY_ACCEPT, SOL: SOL_ACCEPT, SMOM: SMOM_ACCEPT };

// States that do not recognise Kosovo and refuse its passport.
const XKX_NR = ['SRB','RUS','CHN','ESP','GRC','ROU','SVK','CYP','BIH','GEO','UKR','MDA','ARM','AZE','KAZ','IND','IDN','MAR','DZA','CUB','VEN','NIC','SYR','IRN','IRQ','LBN'];

const overrideMap = new Map(OVERRIDES.map(([o, d, v]) => [`${o}→${d}`, v]));

// ── generate ─────────────────────────────────────────────────────────────
let written = 0, skipped = 0;
for (const origin of entities) {
  for (const doc of origin.documents) {
    const file = join(outDir, `${doc.id}.json`);
    if (existsSync(file)) {
      const prev = JSON.parse(readFileSync(file, 'utf8'));
      if (prev.source === 'wikipedia') { skipped++; continue; } // never clobber real data
    }
    const tier = DOC_TIER[doc.id] ?? tierOf(origin.id);
    const access = {};
    for (const dest of ids) {
      if (dest === origin.id) { access[dest] = encode('na'); continue; }
      const key = `${doc.id}→${dest}`, ekey = `${origin.id}→${dest}`;
      if (overrideMap.has(key)) { access[dest] = overrideMap.get(key); continue; }
      if (overrideMap.has(ekey) && doc.id === origin.documents[0].id) { access[dest] = overrideMap.get(ekey); continue; }

      // minimally recognised origin documents: mostly not accepted
      if (MINIMAL_DOCS[origin.id]) {
        access[dest] = MINIMAL_DOCS[origin.id][dest] ?? encode('nr', null, 'Document not generally accepted for entry');
        continue;
      }
      // destinations that don't recognise the origin state
      if (origin.id === 'XKX' && XKX_NR.includes(dest)) {
        access[dest] = encode('nr', null, 'Does not recognise Kosovo'); continue;
      }
      if (dest === 'NCY') { access[dest] = origin.id === 'TUR' ? encode('vf', 90) : encode('vfc', 90, 'De facto entry via Northern Cyprus; the Republic of Cyprus considers non-designated ports illegal'); continue; }
      if (dest === 'SMOM') { access[dest] = encode('na', null, 'The Order controls no territory to enter'); continue; }

      const fom = fomBetween(origin.id, dest);
      if (fom && doc.id !== 'ISR-teudat-maavar') { access[dest] = encode('fom', null, fom); continue; }

      const cls = DEST_CLASS.get(dest) ?? 'standard';
      access[dest] = POLICIES[cls](tier);
    }
    writeFileSync(file, JSON.stringify({
      document: doc.id,
      source: 'seed',
      approximate: true,
      note: 'Approximate demo data generated by scraper/seed-demo-data.mjs. Run the Wikipedia scraper for real data.',
      generatedAt: new Date().toISOString(),
      access,
    }, null, 0));
    written++;
  }
}
console.log(`seed: wrote ${written} document files, preserved ${skipped} scraped files → data/access/`);
