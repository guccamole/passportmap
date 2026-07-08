/**
 * Passport cover imagery. Real covers are downloaded from each passport's
 * Wikipedia page by scraper/scrape-covers.mjs into public/covers/ and mapped
 * in public/data/covers.json → entities.json. Until then (or on 404) we draw
 * an SVG placeholder booklet so the layout always shows a "document".
 */
import type { Entity, TravelDocument } from './types';

const BOOKLET_COLORS: Record<string, string> = {
  default: '#1d2e5e', // most passports are navy/blue
  ISR: '#1d2e5e',
  'ISR-teudat-maavar': '#7a1f1f',
  SMOM: '#8c1515',
  NCY: '#8c1515',
  USA: '#1d2e5e',
};

export function placeholderCover(entity: Entity, doc: TravelDocument): string {
  const color = BOOKLET_COLORS[doc.id] ?? BOOKLET_COLORS[entity.id] ?? BOOKLET_COLORS.default;
  const title = entity.name.toUpperCase();
  const sub = doc.name.replace(`${entity.name} `, '').toUpperCase();
  const titleSize = Math.min(17, Math.floor(300 / (title.length * 0.72)));
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420">
  <rect width="300" height="420" rx="14" fill="${color}"/>
  <rect x="10" y="10" width="280" height="400" rx="10" fill="none" stroke="#c8a951" stroke-width="1.5" opacity="0.7"/>
  <text x="150" y="70" text-anchor="middle" fill="#e7c96a" font-family="Georgia, serif" font-size="${titleSize}" letter-spacing="2">${esc(title)}</text>
  <circle cx="150" cy="200" r="52" fill="none" stroke="#c8a951" stroke-width="3"/>
  <circle cx="150" cy="200" r="40" fill="none" stroke="#c8a951" stroke-width="1.5" opacity="0.7"/>
  <path d="M150 160 L162 190 L194 190 L168 209 L178 240 L150 221 L122 240 L132 209 L106 190 L138 190 Z" fill="#c8a951" opacity="0.85"/>
  <text x="150" y="320" text-anchor="middle" fill="#e7c96a" font-family="Georgia, serif" font-size="${Math.min(14, Math.floor(300 / ((sub || 'PASSPORT').length * 0.75)))}" letter-spacing="3">${esc(sub || 'PASSPORT')}</text>
  <text x="150" y="368" text-anchor="middle" fill="#c8a951" font-family="Georgia, serif" font-size="9" letter-spacing="1" opacity="0.8">ILLUSTRATIVE COVER — run scrape:covers for the real image</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function coverUrl(entity: Entity, doc: TravelDocument, base: string): string {
  return doc.cover ? `${base}covers/${doc.cover}` : placeholderCover(entity, doc);
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
