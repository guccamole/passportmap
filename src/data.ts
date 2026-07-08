/** Data loading and indexing. */
import type {
  AccessEntry, EntitiesFile, Entity, MatrixFile, StatusCode, TravelDocument,
} from './types';
import type { FeatureCollection, Geometry } from 'geojson';
import type { MapFeatureProps } from './types';

export interface AppData {
  entities: Entity[];
  blocs: EntitiesFile['blocs'];
  matrix: MatrixFile;
  world: FeatureCollection<Geometry, MapFeatureProps>;
  entityById: Map<string, Entity>;
  docById: Map<string, { doc: TravelDocument; entity: Entity }>;
}

const base = import.meta.env.BASE_URL;

export async function loadAll(): Promise<AppData> {
  const [entitiesFile, matrix, world] = await Promise.all([
    fetch(`${base}data/entities.json`).then((r) => r.json()) as Promise<EntitiesFile>,
    fetch(`${base}data/matrix.json`).then((r) => r.json()) as Promise<MatrixFile>,
    fetch(`${base}data/map/world.json`).then((r) => r.json()),
  ]);
  const entityById = new Map(entitiesFile.entities.map((e) => [e.id, e]));
  const docById = new Map(
    entitiesFile.entities.flatMap((e) => e.documents.map((d) => [d.id, { doc: d, entity: e }] as const)),
  );
  return { entities: entitiesFile.entities, blocs: entitiesFile.blocs, matrix, world, entityById, docById };
}

export function decode(s: string | undefined): AccessEntry | null {
  if (!s) return null;
  const [code, days, ...note] = s.split('|');
  return { code: code as StatusCode, days: days ? Number(days) : null, note: note.join('|') || null };
}

/** Passport-power view: what document `docId` gets in every destination. */
export function accessOf(data: AppData, docId: string): Map<string, AccessEntry> {
  const row = data.matrix.documents[docId] ?? {};
  return new Map(Object.entries(row).map(([dest, s]) => [dest, decode(s)!]));
}

/**
 * Entry view: what every other passport needs to enter `destId`.
 * Uses each origin entity's PRIMARY (first) document — for multi-document
 * states (e.g. Israel) that is the regular national passport; the sidebar
 * calls this out.
 */
export function entryTo(data: AppData, destId: string): Map<string, AccessEntry> {
  const out = new Map<string, AccessEntry>();
  for (const e of data.entities) {
    const docId = e.documents[0]?.id;
    if (!docId) continue;
    const entry = decode(data.matrix.documents[docId]?.[destId]);
    if (entry) out.set(e.id, entry);
  }
  return out;
}

export const primaryDoc = (e: Entity): TravelDocument => e.documents[0];

/** Data source for a document's row ("wikipedia" | "seed" | undefined). */
export function sourceOf(data: AppData, docId: string) {
  return data.matrix.meta.sources[docId];
}
