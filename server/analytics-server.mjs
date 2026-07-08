/**
 * Minimal production server: serves the built app from dist/ and records
 * analytics events. No dependencies — plain Node.
 *
 *   npm run build && npm run serve     # http://localhost:8787
 *
 * Every event is appended to data/analytics/events-YYYY-MM.jsonl as one JSON
 * line: { ts, ip, country, ua, event, props, session, path, referrer }.
 *   • ts       – exactly when the visit/click happened (server clock)
 *   • ip       – client address (X-Forwarded-For aware, so it works behind
 *                nginx/Cloudflare). Where the IP is "listed" (geo) comes from
 *                the CDN header when present (CF-IPCountry / Vercel's
 *                X-Vercel-IP-Country) — no external lookup calls.
 *   • event    – pageview | select_country | select_document | toggle_view | search
 *
 * GET /api/stats returns quick aggregates (visits, top countries clicked,
 * visitor IP countries) for the current month. Run `npm run stats` for a CLI
 * report. If you'd rather use a hosted analytics product, point
 * VITE_ANALYTICS_ENDPOINT at it and skip this server entirely.
 */
import { createServer } from 'node:http';
import { appendFileSync, mkdirSync, readFileSync, existsSync, createReadStream, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');
const logDir = join(root, 'data/analytics');
mkdirSync(logDir, { recursive: true });

const PORT = Number(process.env.PORT ?? 8787);
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

const logFile = () => join(logDir, `events-${new Date().toISOString().slice(0, 7)}.jsonl`);

const clientIp = (req) =>
  (req.headers['x-forwarded-for']?.split(',')[0] ?? req.socket.remoteAddress ?? '').trim();

const clientCountry = (req) =>
  req.headers['cf-ipcountry'] ?? req.headers['x-vercel-ip-country'] ?? null;

function record(req, body) {
  let payload = {};
  try { payload = JSON.parse(body); } catch { /* keep raw-less */ }
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ip: clientIp(req),
    country: clientCountry(req),
    ua: req.headers['user-agent'] ?? null,
    ...payload,
  });
  appendFileSync(logFile(), line + '\n');
}

function stats() {
  const f = logFile();
  if (!existsSync(f)) return { month: f.slice(-13, -6), events: 0 };
  const lines = readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const count = (arr) => {
    const m = {};
    for (const k of arr) if (k) m[k] = (m[k] ?? 0) + 1;
    return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 25));
  };
  return {
    month: new Date().toISOString().slice(0, 7),
    events: lines.length,
    pageviews: lines.filter((l) => l.event === 'pageview').length,
    uniqueSessions: new Set(lines.map((l) => l.session)).size,
    uniqueIps: new Set(lines.map((l) => l.ip)).size,
    countriesClicked: count(lines.filter((l) => l.event === 'select_country').map((l) => l.props?.entity)),
    documentsViewed: count(lines.filter((l) => l.event === 'select_document').map((l) => l.props?.doc)),
    visitorIpCountries: count(lines.map((l) => l.country)),
    views: count(lines.filter((l) => l.event === 'toggle_view').map((l) => l.props?.view)),
  };
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/api/events') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 16384) req.destroy(); });
    req.on('end', () => {
      try { record(req, body); } catch (e) { console.error('event log failed:', e.message); }
      res.writeHead(204).end();
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/stats') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(stats(), null, 1));
    return;
  }
  // static files from dist/
  let path = normalize(join(dist, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!path.startsWith(dist) || !existsSync(path) || !statSync(path).isFile()) {
    path = join(dist, 'index.html'); // SPA fallback
    if (!existsSync(path)) { res.writeHead(404).end('run `npm run build` first'); return; }
  }
  res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
  createReadStream(path).pipe(res);
}).listen(PORT, () => console.log(`PassportMap serving on http://localhost:${PORT} (analytics → ${logDir})`));
