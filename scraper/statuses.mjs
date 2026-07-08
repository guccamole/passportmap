/**
 * Canonical visa-status vocabulary shared by the scraper, the seed generator
 * and (mirrored in src/types.ts) the frontend.
 *
 * Matrix entries are stored compactly as "<code>" or "<code>|<days>" or
 * "<code>|<days>|<note>" ("" for unknown days).
 */

export const STATUSES = {
  fom:   { label: 'Freedom of movement' },
  vf:    { label: 'Visa-free' },
  vfc:   { label: 'Visa-free (conditional)' },
  eta:   { label: 'Electronic travel authorization (ETA)' },
  ev:    { label: 'eVisa' },
  voa:   { label: 'Visa on arrival' },
  voaev: { label: 'Visa on arrival / eVisa' },
  vr:    { label: 'Visa required' },
  twv:   { label: 'Transit without visa' },
  tvr:   { label: 'Transit visa required' },
  ban:   { label: 'Entry prohibited' },
  susp:  { label: 'Temporary entry suspension' },
  unk:   { label: 'Unknown / no information' },
  nr:    { label: 'Not recognized / document not accepted' },
  na:    { label: 'Not applicable (same country)' },
};

export const encode = (code, days, note) =>
  note ? `${code}|${days ?? ''}|${note}` : days != null ? `${code}|${days}` : code;

export const decode = (s) => {
  const [code, days, ...note] = s.split('|');
  return { code, days: days ? Number(days) : null, note: note.join('|') || null };
};

/** Normalize a Wikipedia "Visa requirement" cell to a status code. Order matters. */
export function normalizeStatus(raw) {
  const t = raw.toLowerCase().replace(/\[.*?\]/g, '').trim();
  if (!t) return 'unk';
  if (/freedom of movement/.test(t)) return 'fom';
  if (/admission refused|entry (is )?(banned|prohibited|refused)|travel banned|banned/.test(t)) return 'ban';
  if (/suspend/.test(t)) return 'susp';
  if (/not recognized|unrecognized|invalid/.test(t)) return 'nr';
  if (/visa not required.*(conditional)|visa-free.*(conditional)|conditional/.test(t) && /visa (not required|free)/.test(t)) return 'vfc';
  if (/visa not required|visa[- ]free|without a visa/.test(t)) return 'vf';
  if (/(visa on arrival|voa).*(evisa|e-visa)|(evisa|e-visa).*(visa on arrival|voa)/.test(t)) return 'voaev';
  if (/visa on arrival|on-arrival/.test(t)) return 'voa';
  if (/electronic travel (authorization|authorisation|authority)|\beta\b|\besta\b|\betias\b|\bnzeta\b|travel authorization/.test(t)) return 'eta';
  if (/e-?visa|electronic visa|online visa/.test(t)) return 'ev';
  if (/transit without visa|twov/.test(t)) return 'twv';
  if (/transit visa/.test(t)) return 'tvr';
  if (/permit required|special (authorization|permission) required|pre-?approval/.test(t)) return 'vr';
  if (/visa required|visa is required/.test(t)) return 'vr';
  if (/disputed|no data|unknown/.test(t)) return 'unk';
  return 'unk';
}

/** Parse an "Allowed stay" cell ("90 days", "3 months", "6 weeks", "1 year") to days. */
export function parseDays(raw) {
  if (!raw) return null;
  const t = raw.toLowerCase().replace(/\[.*?\]/g, '').replace(/,/g, '').trim();
  if (/unlimited|freedom of movement|indefinite/.test(t)) return 3650;
  let m = t.match(/(\d+)\s*day/);
  if (m) return Number(m[1]);
  m = t.match(/(\d+)\s*week/);
  if (m) return Number(m[1]) * 7;
  m = t.match(/(\d+)\s*month/);
  if (m) return Number(m[1]) * 30;
  m = t.match(/(\d+)\s*year/);
  if (m) return Number(m[1]) * 365;
  m = t.match(/(\d+)\s*hour/);
  if (m) return Math.max(1, Math.round(Number(m[1]) / 24));
  m = t.match(/^(\d+)$/);
  if (m) return Number(m[1]);
  return null;
}

export default { STATUSES, encode, decode, normalizeStatus, parseDays };
