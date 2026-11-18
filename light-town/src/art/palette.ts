import type { ThemeId } from '../config/shop';

export const SKY = {
  top: '#0D1838',
  bottom: '#1D2F6B',
  haze: '#2A3F80',
  star: '#FFF3C4',
  moon: '#FFF0C2',
};

export const ACCENT = {
  teal: '#3CC9B4',
  tealDeep: '#23907F',
  tealPale: '#A8EFE2',
};

/** Shading for unlit block surfaces: still clearly outlined against the night sky. */
export const UNLIT = {
  top: '#5A6BA3',
  left: '#3D4C7E',
  right: '#2D3A66',
  edge: '#93A6DC',
  windowFill: '#1A2450',
  windowFrame: '#6A7DB6',
};

export interface LightPalette {
  /** Brightest centre of a lit window or bulb. */
  core: string;
  /** Main lit fill. */
  light: string;
  /** Deeper edge of a lit area. */
  glow: string;
  /** Soft halo drawn behind lit elements (includes alpha). */
  halo: string;
}

/** Permanent light colours of completed elements, per purchasable theme. */
export const THEME_LIGHTS: Record<ThemeId, LightPalette> = {
  warm: { core: '#FFF4C7', light: '#FFD56B', glow: '#FFAE45', halo: 'rgba(255, 196, 92, 0.38)' },
  mint: { core: '#EDFFF8', light: '#93F2D3', glow: '#46D3B0', halo: 'rgba(110, 240, 205, 0.34)' },
  berry: { core: '#FFF0F6', light: '#FFADCB', glow: '#FF7EA9', halo: 'rgba(255, 140, 185, 0.34)' },
};

/** Temporary light points of the level in progress: pale, dotted, never a solid fill. */
export const PENDING_LIGHT = {
  dot: '#FFF6D8',
  outline: '#FFE7A3',
};

/** Base ground colours of the four districts (index matches DISTRICTS). */
export const DISTRICT_GROUND = [
  { name: 'warm-lane', top: '#6E5A80', left: '#53436A', right: '#433656', accent: '#B0705E' },
  { name: 'creek-street', top: '#3C7468', left: '#2D5C55', right: '#234A45', accent: '#3CC9B4' },
  { name: 'starlight-slope', top: '#4F4A94', left: '#3D3978', right: '#302D62', accent: '#C9B8FF' },
  { name: 'moon-bay', top: '#7A6C8E', left: '#5C5172', right: '#4A405E', accent: '#2B6CA0' },
] as const;

/** UI surface colours shared by pages. */
export const UI = {
  text: '#F7F2E6',
  textMuted: '#C5CCE6',
  panel: '#1B2A5E',
  panelRaised: '#24366F',
  border: '#3E539A',
  primary: '#FFC94D',
  primaryText: '#2B1D00',
  focus: '#FFE38A',
};
