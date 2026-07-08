/** CLI analytics report: `npm run stats` (reads data/analytics/*.jsonl). */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const logDir = join(dirname(fileURLToPath(import.meta.url)), '../data/analytics');
if (!existsSync(logDir)) {
  console.log('No analytics recorded yet (data/analytics/ is empty).');
  process.exit(0);
}
const lines = readdirSync(logDir).filter((f) => f.endsWith('.jsonl')).sort()
  .flatMap((f) => readFileSync(join(logDir, f), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)));

const count = (arr, top = 15) => {
  const m = new Map();
  for (const k of arr) if (k) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
};
const table = (title, rows) => {
  console.log(`\n${title}`);
  for (const [k, v] of rows) console.log(`  ${String(v).padStart(6)}  ${k}`);
};

console.log(`PassportMap analytics — ${lines.length} events`);
console.log(`Pageviews: ${lines.filter((l) => l.event === 'pageview').length}`);
console.log(`Unique sessions: ${new Set(lines.map((l) => l.session)).size}`);
console.log(`Unique IPs: ${new Set(lines.map((l) => l.ip)).size}`);
table('Countries clicked', count(lines.filter((l) => l.event === 'select_country').map((l) => l.props?.entity)));
table('Documents viewed', count(lines.filter((l) => l.event === 'select_document').map((l) => l.props?.doc)));
table('Visitor IP countries (from CDN header)', count(lines.map((l) => l.country)));
table('Busiest days', count(lines.map((l) => l.ts?.slice(0, 10))));
