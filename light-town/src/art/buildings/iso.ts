/**
 * Isometric helpers shared by all building and district art.
 * World step +x → screen (+1, +0.5), +y → (−1, +0.5), +z → (0, −1).
 */

export type Pt = readonly [number, number];
/** SVG matrix(a b c d e f). */
export type Mat = readonly [number, number, number, number, number, number];

export function P(x: number, y: number, z = 0): Pt {
  return [x - y, (x + y) / 2 - z];
}

export function n(v: number): string {
  return String(Math.round(v * 100) / 100);
}

export function pts(list: readonly Pt[]): string {
  return list.map((p) => `${n(p[0])},${n(p[1])}`).join(' ');
}

export function mat(m: Mat): string {
  return `matrix(${m.map(n).join(' ')})`;
}

/** Face-local coords (u to the right, v downwards = −z) on the left/front face at y = yF. */
export function LF(yF: number): Mat {
  return [1, 0.5, 0, 1, -yF, yF / 2];
}

/** Face-local coords (u to the right = −y, v downwards = −z) on the right face at x = xF. */
export function RF(xF: number): Mat {
  return [1, -0.5, 0, 1, xF, xF / 2];
}

/** Local (x, y) on the horizontal plane at height z. */
export function TF(z: number): Mat {
  return [1, 0.5, -1, 0.5, 0, -z];
}

export function apply(m: Mat, u: number, v: number): Pt {
  return [m[0] * u + m[2] * v + m[4], m[1] * u + m[3] * v + m[5]];
}

/** Matrix product a·b (apply b first, then a). */
export function mul(a: Mat, b: Mat): Mat {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

export const IDENT: Mat = [1, 0, 0, 1, 0, 0];

export function translate(x: number, y: number): Mat {
  return [1, 0, 0, 1, x, y];
}

export function scaleAbout(cx: number, cy: number, sx: number, sy = sx): Mat {
  return [sx, 0, 0, sy, cx - sx * cx, cy - sy * cy];
}

/** Visible faces of an axis-aligned box. */
export function boxFaces(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number) {
  return {
    top: [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)] as Pt[],
    left: [P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)] as Pt[],
    right: [P(x1, y1, z1), P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0)] as Pt[],
  };
}

/** Outline path of a box: silhouette plus the three front edges. */
export function boxEdges(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number): string {
  const s = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0), P(x0, y1, z1)];
  const a = P(x1, y1, z1);
  const b = P(x1, y1, z0);
  return (
    `M${pts(s).replace(/ /g, ' L')}Z` +
    `M${n(s[5][0])},${n(s[5][1])} L${n(a[0])},${n(a[1])} L${n(s[1][0])},${n(s[1][1])}` +
    `M${n(a[0])},${n(a[1])} L${n(b[0])},${n(b[1])}`
  );
}

/** Points of a polyline as an SVG path "M… L…". */
export function line(list: readonly Pt[], close = false): string {
  return `M${list.map((p) => `${n(p[0])},${n(p[1])}`).join(' L')}${close ? 'Z' : ''}`;
}

/** Four-pointed sparkle star centred at (0,0). */
export function sparklePath(r: number, waist = 0.28): string {
  const w = r * waist;
  return `M0,${n(-r)} Q${n(w)},${n(-w)} ${n(r)},0 Q${n(w)},${n(w)} 0,${n(r)} Q${n(-w)},${n(w)} ${n(-r)},0 Q${n(-w)},${n(-w)} 0,${n(-r)}Z`;
}

/** Five-pointed star centred at (0,0). */
export function starPath(r: number, inner = 0.48): string {
  const p: Pt[] = [];
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * inner;
    p.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return line(p, true);
}

/** Split "rgba(r, g, b, a)" into an rgb colour and an opacity (stop-opacity is the portable form). */
export function splitRgba(c: string): { color: string; opacity: number } {
  const m = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (!m) return { color: c, opacity: 1 };
  return { color: `rgb(${m[1]}, ${m[2]}, ${m[3]})`, opacity: m[4] === undefined ? 1 : Number(m[4]) };
}

/** Deterministic pseudo-random value in [0, 1) from an integer seed. */
export function hash01(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
