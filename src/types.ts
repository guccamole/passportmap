/** Mirrors scraper/statuses.mjs — keep the two in sync. */
export type StatusCode =
  | 'fom' | 'vf' | 'vfc' | 'eta' | 'ev' | 'voa' | 'voaev' | 'vr'
  | 'twv' | 'tvr' | 'ban' | 'susp' | 'unk' | 'nr' | 'na';

export interface AccessEntry {
  code: StatusCode;
  days: number | null;
  note: string | null;
}

export interface TravelDocument {
  id: string;
  name: string;
  visaPage: string;
  passportPage: string;
  wikipediaVisaUrl: string;
  wikipediaPassportUrl: string;
  note?: string;
  cover?: string; // filename under public/covers/, set by the cover scraper
}

export interface Entity {
  id: string;
  name: string;
  demonym: string;
  features: string[]; // map feature names; [] = non-territorial issuer (e.g. SMOM)
  recognition: 'full' | 'partial' | 'minimal';
  blocs: string[];
  documents: TravelDocument[];
  facts: string[];
}

export interface Bloc {
  name: string;
  fom: boolean;
  virtual?: boolean;
  members?: string[];
  union?: string[];
}

export interface EntitiesFile {
  blocs: Record<string, Bloc>;
  entities: Entity[];
}

export interface MatrixFile {
  meta: {
    sources: Record<string, { source?: string; at?: string; url?: string; overridden?: boolean }>;
    builtAt: string;
    anyReal: boolean;
    anySeed: boolean;
  };
  documents: Record<string, Record<string, string>>;
}

export interface MapFeatureProps {
  fid: string;
  name: string;
  entity: string | null;
  territory?: boolean;
}

export type ViewMode = 'power' | 'entry';
