import './style.css';
import { loadAll, accessOf, entryTo, primaryDoc } from './data';
import { WorldMap } from './map';
import { renderSidebar } from './sidebar';
import { renderLegend } from './legend';
import { describe } from './colors';
import { track } from './analytics';
import type { AccessEntry, Entity, ViewMode } from './types';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

interface State {
  view: ViewMode;
  entity: Entity | null;
  docId: string | null;
}

async function boot() {
  const data = await loadAll();
  const state: State = { view: 'power', entity: null, docId: null };

  // current colouring for the map, recomputed on every state change
  let entries = new Map<string, AccessEntry>();
  const refreshEntries = () => {
    entries = !state.entity
      ? new Map()
      : state.view === 'power'
        ? accessOf(data, state.docId ?? primaryDoc(state.entity).id)
        : entryTo(data, state.entity.id);
  };

  const map = new WorldMap($('#map'), data.world.features, {
    entryFor(entityId) {
      if (!entityId) return null;
      if (state.entity && entityId === state.entity.id) return 'selected';
      if (!state.entity) return null;
      return entries.get(entityId) ?? null;
    },
    onClick(entityId) {
      if (!entityId) return;
      select(data.entityById.get(entityId) ?? null);
    },
    onHover(entityId, featureName, event) {
      const tip = $('#tooltip');
      if (!featureName || !event) {
        tip.hidden = true;
        return;
      }
      const e = entityId ? data.entityById.get(entityId) : null;
      let line2 = '';
      if (state.entity && e) {
        if (e.id === state.entity.id) {
          line2 = state.view === 'power' ? 'Selected passport' : 'Selected destination';
        } else {
          const entry = entries.get(e.id) ?? null;
          line2 = describe(entry);
          if (entry?.note) line2 += `<br><em>${entry.note}</em>`;
        }
      } else if (!e) {
        line2 = 'No travel document issued here';
      }
      const territory = e && featureName !== e.name ? ` <small>(${e.name})</small>` : '';
      tip.innerHTML = `<strong>${featureName}</strong>${territory}${line2 ? `<br>${line2}` : ''}`;
      tip.hidden = false;
      const { innerWidth: w } = window;
      tip.style.left = `${Math.min(event.clientX + 14, w - tip.offsetWidth - 8)}px`;
      tip.style.top = `${event.clientY + 14}px`;
    },
  });

  function update() {
    refreshEntries();
    map.recolor();
    renderSidebar($('#sidebar'), data, state.view, state.entity, state.docId, {
      onSelectDocument(docId) {
        state.docId = docId;
        track('select_document', { doc: docId });
        update();
      },
      onClose() {
        state.entity = null;
        state.docId = null;
        update();
      },
    });
    renderList();
  }

  function select(entity: Entity | null, viaSearch = false) {
    $('#tooltip').hidden = true; // a click changes what hover text means; drop the stale tip
    state.entity = entity;
    state.docId = entity ? primaryDoc(entity).id : null;
    if (entity) track('select_country', { entity: entity.id, view: state.view, viaSearch });
    update();
  }

  // ── view toggle ────────────────────────────────────────────────────────
  document.querySelectorAll<HTMLButtonElement>('.view-btn').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.view === state.view) return;
      state.view = b.dataset.view as ViewMode;
      document.querySelectorAll('.view-btn').forEach((x) => x.classList.toggle('active', x === b));
      track('toggle_view', { view: state.view });
      update();
    }),
  );

  // ── left panel: search + special documents + all passports ───────────
  const searchInput = $('#search') as HTMLInputElement;
  const listEl = $('#entity-list');
  function renderList() {
    const q = searchInput.value.trim().toLowerCase();
    const match = (e: Entity) =>
      !q || e.name.toLowerCase().includes(q) || e.demonym.toLowerCase().includes(q) || e.id.toLowerCase() === q;
    const special = data.entities.filter((e) => (e.features.length === 0 || e.recognition !== 'full') && match(e));
    const rest = data.entities.filter((e) => e.features.length > 0 && e.recognition === 'full' && match(e))
      .sort((a, b) => a.name.localeCompare(b.name));
    const row = (e: Entity) => `
      <button class="ent${state.entity?.id === e.id ? ' active' : ''}" data-id="${e.id}">
        <span>${e.name}</span>
        ${e.features.length === 0 ? '<small>no territory</small>' : e.recognition !== 'full' ? `<small>${e.recognition}</small>` : ''}
        ${e.documents.length > 1 ? `<small>${e.documents.length} documents</small>` : ''}
      </button>`;
    listEl.innerHTML =
      (special.length ? `<h3>Special & partially recognized</h3>${special.map(row).join('')}` : '') +
      (rest.length ? `<h3>All passports</h3>${rest.map(row).join('')}` : '');
    listEl.querySelectorAll<HTMLButtonElement>('.ent').forEach((b) =>
      b.addEventListener('click', () => {
        if (searchInput.value) track('search', { query: searchInput.value, picked: b.dataset.id });
        select(data.entityById.get(b.dataset.id!) ?? null, !!searchInput.value);
      }),
    );
  }
  searchInput.addEventListener('input', renderList);
  $('#panel-toggle').addEventListener('click', () => $('#panel-left').classList.toggle('open'));

  // ── misc chrome ────────────────────────────────────────────────────────
  renderLegend($('#legend'));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    renderLegend($('#legend'));
    map.recolor();
  });
  $('#reset-zoom').addEventListener('click', () => map.resetZoom());
  if (data.matrix.meta.anySeed) {
    const b = $('#demo-banner');
    b.hidden = false;
    b.innerHTML = `⚠️ Showing <strong>approximate demo data</strong>${data.matrix.meta.anyReal ? ' for some passports' : ''} — run <code>npm run scrape</code> to load real Wikipedia data. <button id="banner-close">dismiss</button>`;
    $('#banner-close').addEventListener('click', () => (b.hidden = true));
  }

  track('pageview');
  update();
  $('#loading').remove();
}

boot().catch((err) => {
  console.error(err);
  $('#loading').textContent = 'Failed to load PassportMap data — see console.';
});
