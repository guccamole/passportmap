/** Right-hand passport profile / entry breakdown panel. */
import type { AppData } from './data';
import { accessOf, entryTo, sourceOf } from './data';
import type { AccessEntry, Entity, StatusCode, ViewMode } from './types';
import { STATUS_LABELS, swatchFor, describe } from './colors';
import { coverUrl } from './cover';

const ORDER: StatusCode[] = ['fom','vf','vfc','eta','voa','voaev','ev','vr','twv','tvr','susp','ban','nr','unk','na'];
const base = import.meta.env.BASE_URL;

export interface SidebarCallbacks {
  onSelectDocument(docId: string): void;
  onClose(): void;
}

export function renderSidebar(
  el: HTMLElement,
  data: AppData,
  view: ViewMode,
  entity: Entity | null,
  activeDocId: string | null,
  cb: SidebarCallbacks,
): void {
  if (!entity) {
    el.classList.remove('open');
    el.innerHTML = '';
    return;
  }
  el.classList.add('open');

  const doc = entity.documents.find((d) => d.id === activeDocId) ?? entity.documents[0];
  const entries = view === 'power' ? accessOf(data, doc.id) : entryTo(data, entity.id);

  const groups = new Map<StatusCode, { id: string; entry: AccessEntry }[]>();
  for (const [id, entry] of entries) {
    if (id === entity.id) continue;
    if (!groups.has(entry.code)) groups.set(entry.code, []);
    groups.get(entry.code)!.push({ id, entry });
  }

  const src = sourceOf(data, doc.id);
  const blocNames = entity.blocs.map((b) => data.blocs[b]?.name ?? b);

  const h: string[] = [];
  h.push(`<header class="sb-head">
    <div>
      <h2>${esc(entity.name)}</h2>
      ${entity.recognition !== 'full' ? `<span class="badge badge-${entity.recognition}">${entity.recognition === 'minimal' ? 'minimally recognized' : 'partially recognized'}</span>` : ''}
    </div>
    <button class="sb-close" aria-label="Close">×</button>
  </header>`);

  if (blocNames.length) {
    h.push(`<div class="chips">${blocNames.map((b) => `<span class="chip">${esc(b)}</span>`).join('')}</div>`);
  }

  if (view === 'power') {
    if (entity.documents.length > 1) {
      h.push(`<div class="doc-tabs" role="tablist">${entity.documents
        .map((d) => `<button role="tab" aria-selected="${d.id === doc.id}" class="doc-tab${d.id === doc.id ? ' active' : ''}" data-doc="${d.id}">${esc(shortDocName(entity, d.name))}</button>`)
        .join('')}</div>`);
    }
    h.push(`<figure class="cover">
      <img src="${coverUrl(entity, doc, base)}" alt="Cover of ${esc(doc.name)}" loading="lazy"/>
      <figcaption>${esc(doc.name)}${doc.note ? ` — ${esc(doc.note)}` : ''}</figcaption>
    </figure>`);
    h.push(`<p class="src-note">${
      src?.source === 'wikipedia'
        ? `Data scraped from <a href="${doc.wikipediaVisaUrl}" target="_blank" rel="noopener">Wikipedia</a>${src.at ? ` on ${src.at.slice(0, 10)}` : ''}.`
        : `<strong>Demo data (approximate).</strong> Run the scraper to load real data from <a href="${doc.wikipediaVisaUrl}" target="_blank" rel="noopener">Wikipedia</a>.`
    }</p>`);
  } else {
    h.push(`<p class="entry-intro">Visa access <strong>every other passport</strong> enjoys to enter ${esc(entity.name)}. Multi-document states are shown by their primary passport.</p>`);
  }

  if (view === 'power' && entity.facts.length) {
    h.push(`<div class="facts">${entity.facts.map((f) => `<p>💡 ${esc(f)}</p>`).join('')}</div>`);
  }

  h.push('<div class="breakdown">');
  for (const code of ORDER) {
    const rows = groups.get(code);
    if (!rows?.length) continue;
    rows.sort((a, b) => (b.entry.days ?? 0) - (a.entry.days ?? 0) || nameOf(data, a.id).localeCompare(nameOf(data, b.id)));
    h.push(`<details class="status-group">
      <summary><span class="sw" style="background:${swatchFor(code)}"></span>
        <span class="lbl">${STATUS_LABELS[code]}</span><span class="count">${rows.length}</span></summary>
      <ul>${rows.map(({ id, entry }) =>
        `<li><span>${esc(nameOf(data, id))}</span><span class="days">${detail(entry)}</span></li>`).join('')}</ul>
    </details>`);
  }
  h.push('</div>');

  if (view === 'power') {
    h.push(`<p class="wiki-links"><a href="${doc.wikipediaPassportUrl}" target="_blank" rel="noopener">Passport on Wikipedia ↗</a></p>`);
  }

  el.innerHTML = h.join('');
  el.querySelector('.sb-close')?.addEventListener('click', cb.onClose);
  el.querySelectorAll<HTMLButtonElement>('.doc-tab').forEach((b) =>
    b.addEventListener('click', () => cb.onSelectDocument(b.dataset.doc!)),
  );
}

const nameOf = (data: AppData, id: string) => data.entityById.get(id)?.name ?? id;

function detail(e: AccessEntry): string {
  if (e.days) return e.days >= 3650 ? 'unlimited' : `${e.days}d`;
  return '';
}

function shortDocName(entity: Entity, name: string): string {
  return name.replace(`${entity.name} passport`, 'Passport').replace(' (travel document)', '');
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export { describe };
