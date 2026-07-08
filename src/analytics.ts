/**
 * Usage analytics. Every event is POSTed (sendBeacon when possible) to the
 * analytics endpoint — by default `/api/events`, served by
 * server/analytics-server.mjs, which records timestamp, IP address and
 * user agent server-side. Point VITE_ANALYTICS_ENDPOINT elsewhere (e.g. a
 * serverless function or Plausible bridge) to swap backends.
 *
 * Events tracked:
 *   pageview                        – when people visit
 *   select_country {entity, view}   – which countries they click on
 *   select_document {doc}           – Darkon vs Teudat Ma'avar etc.
 *   toggle_view {view}              – power ↔ entry
 *   search {query}                  – left-panel searches (on selection)
 */
const ENDPOINT: string = import.meta.env.VITE_ANALYTICS_ENDPOINT ?? '/api/events';

const sessionId: string = (() => {
  const k = 'pm-session';
  let v = sessionStorage.getItem(k);
  if (!v) {
    v = crypto.randomUUID();
    sessionStorage.setItem(k, v);
  }
  return v;
})();

export function track(event: string, props: Record<string, unknown> = {}): void {
  const payload = JSON.stringify({
    event,
    props,
    session: sessionId,
    path: location.pathname,
    referrer: document.referrer || null,
    ts: new Date().toISOString(),
  });
  try {
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([payload], { type: 'application/json' }))) return;
    void fetch(ENDPOINT, { method: 'POST', body: payload, keepalive: true, headers: { 'content-type': 'application/json' } });
  } catch {
    /* analytics must never break the app */
  }
}
