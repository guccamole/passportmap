/**
 * Status → color mapping. Validated with the dataviz palette validator:
 *   • green (visa-free) and teal (visa on arrival) ramps: monotone lightness,
 *     light end deliberately recedes ("10 days ≈ barely green", per design).
 *   • discrete statuses: worst CVD pair ΔE 9.7 (floor band) — legal because
 *     every fill ships secondary encoding: hover tooltips naming the status,
 *     the sidebar's per-status country lists, the legend, and hairline
 *     polygon strokes.
 */
import type { AccessEntry, StatusCode } from './types';

export const STATUS_LABELS: Record<StatusCode, string> = {
  fom: 'Freedom of movement',
  vf: 'Visa-free',
  vfc: 'Visa-free (conditional)',
  eta: 'Electronic travel authorization',
  ev: 'eVisa',
  voa: 'Visa on arrival',
  voaev: 'Visa on arrival / eVisa',
  vr: 'Visa required',
  twv: 'Transit without visa',
  tvr: 'Transit visa required',
  ban: 'Entry prohibited',
  susp: 'Entry temporarily suspended',
  unk: 'Unknown / no information',
  nr: 'Not recognized / not accepted',
  na: 'Not applicable',
};

/** days → ramp step: longer stay = darker. */
const DAY_STEPS = [15, 31, 61, 91, 181, 365];
export const dayStep = (days: number | null): number => {
  if (days == null) return 3; // unknown duration → mid tone
  let i = 0;
  while (i < DAY_STEPS.length && days >= DAY_STEPS[i]) i++;
  return i;
};

/** Visa-free: green, light→dark by allowed stay. */
export const VF_RAMP = ['#cdeac3', '#a9dba2', '#83c982', '#5cb567', '#3c9d51', '#24813c', '#12622a'];
/** Visa on arrival (and VOA/eVisa): teal, same day gradation. */
export const VOA_RAMP = ['#c6e8dd', '#9fd8c5', '#77c6ac', '#54b192', '#379878', '#217d60', '#116048'];

export const FIXED: Partial<Record<StatusCode, string>> = {
  fom: '#2a78d6',
  eta: '#84a81f',
  ev: '#e6b83f',
  vr: '#d03b3b',
  twv: '#b6a7e3',
  tvr: '#7c62b8',
  ban: '#0b0b0b',
  susp: '#5b2160',
  nr: '#332e2b',
};

export const UNKNOWN_LIGHT = '#d8d6cf';
export const UNKNOWN_DARK = '#3f3e3a';
export const NO_ENTITY_LIGHT = '#c9c6bd';
export const NO_ENTITY_DARK = '#2e2d2b';
export const SELECTED_FILL = '#5b6472';
export const SELECTED_STROKE = '#f4b400';

export function isDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function colorFor(entry: AccessEntry | null): string {
  if (!entry) return isDark() ? UNKNOWN_DARK : UNKNOWN_LIGHT;
  switch (entry.code) {
    case 'vf':
    case 'vfc':
      return VF_RAMP[dayStep(entry.days)];
    case 'voa':
    case 'voaev':
      return VOA_RAMP[dayStep(entry.days)];
    case 'unk':
      return isDark() ? UNKNOWN_DARK : UNKNOWN_LIGHT;
    case 'na':
      return SELECTED_FILL;
    default:
      return FIXED[entry.code] ?? (isDark() ? UNKNOWN_DARK : UNKNOWN_LIGHT);
  }
}

/** Conditional visa-free is drawn with a diagonal hatch over its ramp color. */
export const needsHatch = (entry: AccessEntry | null): boolean => entry?.code === 'vfc';

/** Legend swatch for a status (mid ramp tone for the graded ones). */
export function swatchFor(code: StatusCode): string {
  if (code === 'vf' || code === 'vfc') return VF_RAMP[4];
  if (code === 'voa' || code === 'voaev') return VOA_RAMP[4];
  if (code === 'unk') return isDark() ? UNKNOWN_DARK : UNKNOWN_LIGHT;
  if (code === 'na') return SELECTED_FILL;
  return FIXED[code] ?? UNKNOWN_LIGHT;
}

export function describe(entry: AccessEntry | null): string {
  if (!entry) return STATUS_LABELS.unk;
  let s = STATUS_LABELS[entry.code] ?? entry.code;
  if (entry.days) s += ` · ${entry.days >= 3650 ? 'unlimited stay' : `${entry.days} days`}`;
  return s;
}
