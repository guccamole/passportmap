/**
 * Build PassportMap's own world map file: public/data/map/world.json
 *
 * The map is OURS — a plain GeoJSON FeatureCollection committed to the repo —
 * so geopolitical changes never depend on an upstream map vendor:
 *
 *   • The generator seeds it from public-domain Natural Earth 1:50m geometry
 *     (via the `world-atlas` npm package), which already draws de-facto
 *     states (Northern Cyprus, Somaliland, Kosovo, Taiwan, Palestine, …) as
 *     separate polygons.
 *   • After generation the file stands alone. Edit it directly with any
 *     GeoJSON tool (mapshaper.org, geojson.io, QGIS) — split a polygon to
 *     create a new state, delete a feature when one dissolves — or express
 *     the change in MAP_OVERRIDES below and re-run `node tools/build-map.mjs`.
 *
 * Feature properties:
 *   fid    – stable feature id (slug of the Natural Earth name)
 *   name   – display name
 *   entity – PassportMap entity id owning this polygon (null = no travel
 *            document, e.g. Antarctica). Territories point at their
 *            sovereign (Greenland → DNK) so clicking them shows the passport
 *            their residents carry.
 *   territory – true when the polygon is a dependency rather than the
 *            entity's core territory.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as topojson from 'topojson-client';
import { buildEntities } from './registry.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

/**
 * Geopolitical patches, applied after the base build. Keep changes here (or
 * edit world.json directly) — never patch node_modules.
 *   remove:   fids to drop entirely (e.g. a dissolved state).
 *   reassign: fid → entity id, when a polygon changes hands.
 *   rename:   fid → new display name.
 *   add:      extra GeoJSON features (drawn by hand / AI / traced) to append.
 */
const MAP_OVERRIDES = {
  remove: [],
  reassign: {},
  rename: {
    'macedonia': 'North Macedonia',
    'w-sahara': 'Western Sahara',
    'n-cyprus': 'Northern Cyprus',
    'dem-rep-congo': 'DR Congo',
    'eswatini': 'Eswatini',
    'falkland-is': 'Falkland Islands',
  },
  add: [],
};

const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
   .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const topo = JSON.parse(
  readFileSync(join(root, 'node_modules/world-atlas/countries-50m.json'), 'utf8'),
);
const fc = topojson.feature(topo, topo.objects.countries);

const entities = buildEntities();
const featureToEntity = new Map(); // NE feature name -> {id, core}
for (const e of entities) {
  e.features.forEach((f, i) => featureToEntity.set(f, { id: e.id, core: i === 0 }));
}

const round = (n) => Math.round(n * 1000) / 1000;
const roundRing = (ring) => ring.map(([x, y]) => [round(x), round(y)]);
const roundGeom = (g) => {
  if (g.type === 'Polygon') return { ...g, coordinates: g.coordinates.map(roundRing) };
  if (g.type === 'MultiPolygon')
    return { ...g, coordinates: g.coordinates.map((p) => p.map(roundRing)) };
  return g;
};

let features = fc.features
  .filter((f) => f.properties.name !== 'Antarctica') // no passports at the pole; drop to keep the canvas tight
  .map((f) => {
    const name = f.properties.name;
    const owner = featureToEntity.get(name);
    return {
      type: 'Feature',
      properties: {
        fid: slug(name),
        name,
        entity: owner?.id ?? null,
        ...(owner && !owner.core ? { territory: true } : {}),
      },
      geometry: roundGeom(f.geometry),
    };
  });

// apply overrides
features = features.filter((f) => !MAP_OVERRIDES.remove.includes(f.properties.fid));
for (const f of features) {
  const { fid } = f.properties;
  if (MAP_OVERRIDES.reassign[fid]) f.properties.entity = MAP_OVERRIDES.reassign[fid];
  if (MAP_OVERRIDES.rename[fid]) f.properties.name = MAP_OVERRIDES.rename[fid];
}
features.push(...MAP_OVERRIDES.add);

const out = {
  type: 'FeatureCollection',
  meta: {
    generator: 'tools/build-map.mjs',
    source: 'Natural Earth 1:50m admin-0 (public domain) via world-atlas, plus PassportMap overrides',
    generated: new Date().toISOString(),
    note: 'This file is owned by PassportMap. Edit it directly or via MAP_OVERRIDES in tools/build-map.mjs.',
  },
  features,
};

mkdirSync(join(root, 'public/data/map'), { recursive: true });
const path = join(root, 'public/data/map/world.json');
writeFileSync(path, JSON.stringify(out));
const unmatched = features.filter((f) => !f.properties.entity).map((f) => f.properties.name);
console.log(`world.json: ${features.length} features, ${(JSON.stringify(out).length / 1e6).toFixed(1)} MB`);
console.log('features with no entity (render as “no passport”):', unmatched.join(', ') || 'none');
