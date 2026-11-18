/**
 * Night-time material colours for buildings and terrain. Kept slightly desaturated and
 * blue-shifted (same family as UNLIT in palette.ts) so that window light stands out.
 */

export interface Tone {
  top: string;
  left: string;
  right: string;
  edge: string;
}

export const TONES = {
  plaster: { top: '#ABA5CB', left: '#8D87B6', right: '#6D689B', edge: '#D6D0F2' },
  cream: { top: '#C8C2DE', left: '#ABA4C9', right: '#8780A9', edge: '#EEE9FF' },
  brick: { top: '#A97B8E', left: '#8F6177', right: '#704A62', edge: '#D4AABB' },
  wood: { top: '#8F7389', left: '#755B74', right: '#5B465D', edge: '#C2A5BB' },
  darkWood: { top: '#6E5670', left: '#58445C', right: '#45354B', edge: '#A48BA6' },
  stone: { top: '#8F98C3', left: '#707AA9', right: '#56608D', edge: '#BCC5EC' },
  base: { top: '#6B709B', left: '#51567F', right: '#40456A', edge: '#9BA1CE' },
  roofRed: { top: '#B66C80', left: '#9B5571', right: '#7D4561', edge: '#E29CB0' },
  roofTeal: { top: '#47AA9E', left: '#348B83', right: '#296F6B', edge: '#8CE0D3' },
  roofSlate: { top: '#5F6CA8', left: '#4B578F', right: '#3C4778', edge: '#909EDC' },
  roofPlum: { top: '#8C66AA', left: '#72508F', right: '#5B4077', edge: '#BC96DA' },
  lilac: { top: '#9C8FC6', left: '#7F72AC', right: '#655A90', edge: '#C9BDF0' },
  sage: { top: '#7FA59E', left: '#648A86', right: '#4E6F6E', edge: '#B1D6CE' },
  sand: { top: '#B7A58F', left: '#9A8875', right: '#7C6C5E', edge: '#E3D2BD' },
  metal: { top: '#7F8BB5', left: '#66719C', right: '#4F5880', edge: '#B3BEE6' },
  rose: { top: '#B897BA', left: '#9B7AA0', right: '#7C6086', edge: '#E3C5E4' },
} satisfies Record<string, Tone>;

/** Flat accent colours used for small details. */
export const INK = {
  frame: '#4B3D5E',
  frameLight: '#E9DDC9',
  door: '#6A4A63',
  doorDark: '#4E3549',
  leaf: '#3FA48E',
  leafDark: '#2C7D6E',
  trunk: '#6B5160',
  shadow: 'rgba(10, 16, 44, 0.35)',
  glass: '#2B3C74',
  glassEdge: '#7FD9C9',
  rope: '#B9A68E',
  awningA: '#E7D9C2',
  awningB: '#3CA897',
  flagA: '#E8708F',
  flagB: '#F2C45A',
  flagC: '#5CC9B5',
  flagD: '#9C86E0',
};
