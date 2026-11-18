import type { ReactNode } from 'react';
import type { LightPalette } from '../palette';
import { PENDING_LIGHT, UI, UNLIT } from '../palette';
import type { Pt } from './iso';
import { hash01, line, n, pts, sparklePath } from './iso';
import { TONES, INK } from './materials';
import type { Tone } from './materials';

/** District drawing context. */
export interface DCtx {
  u: string;
  L: LightPalette;
  animate: boolean;
  stages: readonly [number, number, number];
  id(name: string): string;
  url(name: string): string;
  cls(name: string): string | undefined;
}

export interface DistrictModule {
  /** Terrain and decorations behind the buildings. */
  back(c: DCtx): ReactNode;
  /** Decorations in front of the buildings (kept clear of the label areas). */
  front?(c: DCtx): ReactNode;
}

/** Ground band of the given width along a world polyline (mitred corners), as screen points. */
export function worldBand(path: readonly (readonly [number, number])[], width: number, z = 0): Pt[] {
  const h = width / 2;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < path.length; i += 1) {
    const p = path[i];
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(path.length - 1, i + 1)];
    const d0 = i === 0 ? [b[0] - p[0], b[1] - p[1]] : [p[0] - a[0], p[1] - a[1]];
    const d1 = i === path.length - 1 ? d0 : [b[0] - p[0], b[1] - p[1]];
    const l0 = Math.hypot(d0[0], d0[1]) || 1;
    const l1 = Math.hypot(d1[0], d1[1]) || 1;
    const n0 = [-d0[1] / l0, d0[0] / l0];
    const n1 = [-d1[1] / l1, d1[0] / l1];
    let mx = n0[0] + n1[0];
    let my = n0[1] + n1[1];
    const ml = Math.hypot(mx, my) || 1;
    mx /= ml;
    my /= ml;
    const scale = h / Math.max(0.35, mx * n1[0] + my * n1[1]);
    left.push(W(p[0] + mx * scale, p[1] + my * scale, z));
    right.push(W(p[0] - mx * scale, p[1] - my * scale, z));
  }
  return [...left, ...right.reverse()];
}

/** Points along a world polyline at a fixed spacing (for cobbles, lamps…). */
export function alongPath(path: readonly (readonly [number, number])[], step: number, offset = 0): [number, number][] {
  const out: [number, number][] = [];
  let carry = offset;
  for (let i = 1; i < path.length; i += 1) {
    const [x0, y0] = path[i - 1];
    const [x1, y1] = path[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    let t = carry;
    while (t <= len) {
      out.push([x0 + ((x1 - x0) * t) / len, y0 + ((y1 - y0) * t) / len]);
      t += step;
    }
    carry = t - len;
  }
  return out;
}

/** District world → viewBox projection (same 2:1 iso as the buildings, scale 1). */
export function W(x: number, y: number, z = 0): Pt {
  return [600 + x - y, 400 + (x + y) / 2 - z];
}

export interface GroundTone {
  top: string;
  left: string;
  right: string;
  accent: string;
}

/**
 * A voxel island block: rectilinear world polygon at height z with cliffs of thickness t.
 * Draws front-facing cliffs (strata, darker base, hanging rocks) then the top surface.
 */
export function islandBlock(
  poly: readonly (readonly [number, number])[],
  z: number,
  t: number,
  g: GroundTone,
  key: string,
  o: { rocks?: boolean; topFill?: string; edgeColor?: string } = {},
): ReactNode {
  let area = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const cliffs: { q: Pt[]; right: boolean; depth: number; a: readonly [number, number]; b: readonly [number, number] }[] = [];
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const nx = area > 0 ? dy : -dy;
    const ny = area > 0 ? -dx : dx;
    if (nx > 0 || ny > 0) {
      cliffs.push({
        q: [W(a[0], a[1], z), W(b[0], b[1], z), W(b[0], b[1], z - t), W(a[0], a[1], z - t)],
        right: nx > 0,
        depth: (a[0] + a[1] + b[0] + b[1]) / 2,
        a,
        b,
      });
    }
  }
  cliffs.sort((p, q) => p.depth - q.depth);
  const top = poly.map(([x, y]) => W(x, y, z));
  const rocks: ReactNode[] = [];
  if (o.rocks !== false) {
    cliffs.forEach((c, ci) => {
      const len = Math.hypot(c.b[0] - c.a[0], c.b[1] - c.a[1]);
      const count = Math.floor(len / 70);
      for (let j = 0; j < count; j += 1) {
        const f = (j + 0.5 + (hash01(ci * 13 + j) - 0.5) * 0.5) / count;
        const wx = c.a[0] + (c.b[0] - c.a[0]) * f;
        const wy = c.a[1] + (c.b[1] - c.a[1]) * f;
        const [sx, sy] = W(wx, wy, z - t);
        const h = 10 + 22 * hash01(ci * 7 + j * 3 + 1);
        const w = 12 + 10 * hash01(ci * 5 + j);
        rocks.push(
          <path
            key={`${ci}-${j}`}
            d={`M${n(sx - w)},${n(sy - 1)} L${n(sx + w)},${n(sy - 1)} L${n(sx + w * 0.3)},${n(sy + h * 0.6)} L${n(sx - w * 0.1)},${n(sy + h)} L${n(sx - w * 0.5)},${n(sy + h * 0.45)}Z`}
            fill={c.right ? g.right : g.left}
            opacity={0.95}
          />,
        );
      }
    });
  }
  return (
    <g key={key}>
      {rocks}
      {cliffs.map((c, i) => {
        const shade = c.right ? g.right : g.left;
        const [p0, p1, p2, p3] = c.q;
        const mid = (f: number): Pt[] => [
          [p0[0], p0[1] + (p3[1] - p0[1]) * f],
          [p1[0], p1[1] + (p2[1] - p1[1]) * f],
        ];
        return (
          <g key={i}>
            <polygon points={pts(c.q)} fill={shade} />
            <polygon points={pts([...mid(0.62), p2, p3])} fill="#141A3A" opacity={0.28} />
            <path d={line(mid(0.3))} stroke={g.top} strokeWidth={1.2} opacity={0.25} />
            <path d={line(mid(0.62))} stroke={g.top} strokeWidth={1} opacity={0.18} />
          </g>
        );
      })}
      <polygon points={pts(top)} fill={o.topFill ?? g.top} />
      <path d={line(top, true)} fill="none" stroke={o.edgeColor ?? g.accent} strokeWidth={1.6} strokeOpacity={0.55} strokeLinejoin="round" />
    </g>
  );
}

/** Flat polygon lying on the ground (world coordinates). */
export function groundPoly(list: readonly (readonly [number, number])[], fill: string, z = 0, extra: { opacity?: number; stroke?: string } = {}): ReactNode {
  return (
    <polygon
      points={pts(list.map(([x, y]) => W(x, y, z)))}
      fill={fill}
      opacity={extra.opacity}
      stroke={extra.stroke}
      strokeWidth={extra.stroke ? 1.2 : undefined}
      strokeOpacity={extra.stroke ? 0.5 : undefined}
    />
  );
}

/** An iso box in district world coordinates. */
export function dBox(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, t: Tone, key?: string | number): ReactNode {
  const tp = [W(x0, y0, z1), W(x1, y0, z1), W(x1, y1, z1), W(x0, y1, z1)];
  const lf = [W(x0, y1, z1), W(x1, y1, z1), W(x1, y1, z0), W(x0, y1, z0)];
  const rt = [W(x1, y1, z1), W(x1, y0, z1), W(x1, y0, z0), W(x1, y1, z0)];
  return (
    <g key={key}>
      <polygon points={pts(lf)} fill={t.left} />
      <polygon points={pts(rt)} fill={t.right} />
      <polygon points={pts(tp)} fill={t.top} />
      <path d={line([tp[0], tp[1], tp[2], tp[3]], true) + line([tp[2], W(x1, y1, z0)])} fill="none" stroke={t.edge} strokeWidth={1} strokeOpacity={0.6} />
    </g>
  );
}

/** Street lamp; glows with the theme light when `lit`. */
export function lampPost(c: DCtx, x: number, y: number, lit: boolean, key: string | number, h = 46, z = 0): ReactNode {
  const [sx, sy] = W(x, y, z);
  const hy = sy - h;
  return (
    <g key={key}>
      <ellipse cx={n(sx)} cy={n(sy)} rx={6} ry={3} fill="#141A3A" opacity={0.35} />
      {lit ? <ellipse cx={n(sx)} cy={n(sy)} rx={34} ry={14} fill={c.url('spill')} /> : null}
      <path d={`M${n(sx)},${n(sy)} L${n(sx)},${n(hy + 6)}`} stroke={INK.frame} strokeWidth={2.6} strokeLinecap="round" />
      <path d={`M${n(sx - 3.5)},${n(sy - 2)} L${n(sx + 3.5)},${n(sy - 2)}`} stroke={INK.frame} strokeWidth={3} strokeLinecap="round" />
      {lit ? <circle cx={n(sx)} cy={n(hy)} r={20} fill={c.url('halo')} /> : null}
      <path d={`M${n(sx - 6)},${n(hy - 6)} L${n(sx)},${n(hy - 12)} L${n(sx + 6)},${n(hy - 6)}Z`} fill={INK.frame} />
      <rect
        x={n(sx - 4.5)}
        y={n(hy - 6)}
        width={9}
        height={11}
        rx={2}
        fill={lit ? c.L.light : UNLIT.windowFill}
        stroke={lit ? c.L.glow : UNLIT.windowFrame}
        strokeWidth={1.1}
      />
      {lit ? <rect x={n(sx - 2)} y={n(hy - 3.5)} width={4} height={6} rx={1.5} fill={c.L.core} /> : null}
    </g>
  );
}

/** Round-canopy tree. */
export function tree(x: number, y: number, s: number, key: string | number, colors = { a: '#3FA48E', b: '#2C7D6E', c: '#5CC2A8' }, z = 0): ReactNode {
  const [sx, sy] = W(x, y, z);
  return (
    <g key={key}>
      <ellipse cx={n(sx)} cy={n(sy)} rx={n(16 * s)} ry={n(7 * s)} fill="#141A3A" opacity={0.3} />
      <path d={`M${n(sx - 3 * s)},${n(sy)} L${n(sx - 2 * s)},${n(sy - 26 * s)} L${n(sx + 2 * s)},${n(sy - 26 * s)} L${n(sx + 3 * s)},${n(sy)}Z`} fill={INK.trunk} />
      <circle cx={n(sx - 8 * s)} cy={n(sy - 30 * s)} r={n(13 * s)} fill={colors.b} />
      <circle cx={n(sx + 9 * s)} cy={n(sy - 32 * s)} r={n(12 * s)} fill={colors.b} />
      <circle cx={n(sx)} cy={n(sy - 42 * s)} r={n(15 * s)} fill={colors.a} />
      <circle cx={n(sx - 5 * s)} cy={n(sy - 47 * s)} r={n(6 * s)} fill={colors.c} opacity={0.75} />
    </g>
  );
}

/** Pointy conifer (used on the starlit slope). */
export function pine(x: number, y: number, s: number, key: string | number, z = 0, colors = { a: '#3C8F87', b: '#2B6E6C' }): ReactNode {
  const [sx, sy] = W(x, y, z);
  return (
    <g key={key}>
      <ellipse cx={n(sx)} cy={n(sy)} rx={n(13 * s)} ry={n(6 * s)} fill="#141A3A" opacity={0.3} />
      <rect x={n(sx - 2.5 * s)} y={n(sy - 12 * s)} width={n(5 * s)} height={n(12 * s)} fill={INK.trunk} />
      <path d={`M${n(sx - 16 * s)},${n(sy - 10 * s)} L${n(sx)},${n(sy - 40 * s)} L${n(sx + 16 * s)},${n(sy - 10 * s)}Z`} fill={colors.b} />
      <path d={`M${n(sx - 12 * s)},${n(sy - 26 * s)} L${n(sx)},${n(sy - 54 * s)} L${n(sx + 12 * s)},${n(sy - 26 * s)}Z`} fill={colors.a} />
      <path d={`M${n(sx)},${n(sy - 54 * s)} L${n(sx + 12 * s)},${n(sy - 26 * s)} L${n(sx + 3 * s)},${n(sy - 27 * s)}Z`} fill={colors.b} opacity={0.6} />
    </g>
  );
}

export function bush(x: number, y: number, s: number, key: string | number, color = '#3FA48E', z = 0): ReactNode {
  const [sx, sy] = W(x, y, z);
  return (
    <g key={key}>
      <ellipse cx={n(sx)} cy={n(sy)} rx={n(13 * s)} ry={n(5.5 * s)} fill="#141A3A" opacity={0.3} />
      <circle cx={n(sx - 6 * s)} cy={n(sy - 6 * s)} r={n(7 * s)} fill="#2C7D6E" />
      <circle cx={n(sx + 6 * s)} cy={n(sy - 6 * s)} r={n(6.5 * s)} fill="#2C7D6E" />
      <circle cx={n(sx)} cy={n(sy - 10 * s)} r={n(8 * s)} fill={color} />
    </g>
  );
}

/** Little flowers scattered on the ground. */
export function flowers(spots: readonly (readonly [number, number])[], key: string, z = 0): ReactNode {
  const colors = [INK.flagA, INK.flagB, INK.flagD, '#F4EEDC'];
  return (
    <g key={key}>
      {spots.map(([x, y], i) => {
        const [sx, sy] = W(x, y, z);
        return (
          <g key={i}>
            <path d={`M${n(sx)},${n(sy)} L${n(sx)},${n(sy - 5)}`} stroke={INK.leafDark} strokeWidth={1} />
            <circle cx={n(sx)} cy={n(sy - 6)} r={2.2} fill={colors[i % colors.length]} />
          </g>
        );
      })}
    </g>
  );
}

export function grass(spots: readonly (readonly [number, number])[], key: string, color = '#5CC2A8', z = 0): ReactNode {
  return (
    <g key={key} stroke={color} strokeWidth={1.3} strokeLinecap="round" opacity={0.7} fill="none">
      {spots.map(([x, y], i) => {
        const [sx, sy] = W(x, y, z);
        return <path key={i} d={`M${n(sx - 3)},${n(sy - 4)} L${n(sx - 1)},${n(sy)} L${n(sx)},${n(sy - 6)} L${n(sx + 1)},${n(sy)} L${n(sx + 3)},${n(sy - 4)}`} />;
      })}
    </g>
  );
}

export function bench(x: number, y: number, key: string | number, z = 0): ReactNode {
  const t = TONES.wood;
  return (
    <g key={key}>
      {[x - 10, x + 10].map((lx, i) => {
        const [a, b] = [W(lx, y, z), W(lx, y, z + 7)];
        return <path key={i} d={line([a, b])} stroke={INK.frame} strokeWidth={2} />;
      })}
      <polygon points={pts([W(x - 13, y - 3, z + 8), W(x + 13, y - 3, z + 8), W(x + 13, y + 3, z + 8), W(x - 13, y + 3, z + 8)])} fill={t.top} stroke={t.edge} strokeWidth={0.6} strokeOpacity={0.6} />
      <polygon points={pts([W(x - 13, y - 3, z + 8), W(x + 13, y - 3, z + 8), W(x + 13, y - 3, z + 16), W(x - 13, y - 3, z + 16)])} fill={t.left} />
    </g>
  );
}

export function barrel(x: number, y: number, key: string | number, z = 0): ReactNode {
  const [sx, sy] = W(x, y, z);
  return (
    <g key={key}>
      <path d={`M${n(sx - 7)},${n(sy - 14)} L${n(sx - 7)},${n(sy)} A7,3.5 0 0 0 ${n(sx + 7)},${n(sy)} L${n(sx + 7)},${n(sy - 14)}Z`} fill={TONES.wood.left} />
      <ellipse cx={n(sx)} cy={n(sy - 14)} rx={7} ry={3.5} fill={TONES.wood.top} />
      <path d={`M${n(sx - 7)},${n(sy - 4)} A7,3.5 0 0 0 ${n(sx + 7)},${n(sy - 4)} M${n(sx - 7)},${n(sy - 10)} A7,3.5 0 0 0 ${n(sx + 7)},${n(sy - 10)}`} fill="none" stroke={INK.frame} strokeWidth={1.2} />
    </g>
  );
}

/** A few local stars (twinkling softly when animated). */
export function localStars(c: DCtx, list: readonly (readonly [number, number, number])[], key: string): ReactNode {
  return (
    <g key={key}>
      {list.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${n(x)} ${n(y)})`}>
          <g className={c.cls('twinkle')} style={c.animate ? { animationDelay: `${-((i * 0.83) % 4)}s` } : undefined}>
            <path d={sparklePath(r)} fill="#FFF3C4" opacity={0.85} />
          </g>
        </g>
      ))}
    </g>
  );
}

/** Current-target marker: dashed glowing ground ring and a floating lantern with a down arrow. */
export function currentMarker(c: DCtx, x: number, y: number, s: number, top: number, part: 'ring' | 'float'): ReactNode {
  if (part === 'ring') {
    return (
      <g transform={`translate(${n(x)} ${n(y)}) scale(${n(s)})`}>
        <ellipse rx={96} ry={44} fill={c.url('ring')} />
        <g className={c.cls('ringPulse')}>
          <ellipse rx={88} ry={40} fill="none" stroke="#2A2150" strokeWidth={6} strokeOpacity={0.45} />
          <ellipse rx={88} ry={40} fill="none" stroke={UI.focus} strokeWidth={3.2} strokeDasharray="12 9" strokeLinecap="round" />
        </g>
      </g>
    );
  }
  const fy = Math.max(98, y + top * s - 34);
  return (
    <g transform={`translate(${n(x)} ${n(fy)})`}>
      <g className={c.cls('bob')}>
        <circle r={24} fill={c.url('ring')} />
        <path d="M-7,-12 L0,-19 L7,-12Z" fill={UI.primaryText} />
        <rect x={-8} y={-12} width={16} height={18} rx={4} fill={PENDING_LIGHT.outline} stroke={UI.primaryText} strokeWidth={2} />
        <rect x={-3.5} y={-8} width={7} height={10} rx={2.5} fill="#FFFFFF" />
        <path d="M-9,13 L0,24 L9,13" fill="none" stroke={UI.focus} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M-9,13 L0,24 L9,13" fill="none" stroke={UI.primaryText} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
      </g>
    </g>
  );
}

/** Warm string lights between two screen points, lit or dark. */
export function stringLights(c: DCtx, a: Pt, b: Pt, sag: number, count: number, lit: boolean, key: string): ReactNode {
  const p: Pt[] = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t)] as Pt;
  });
  const bulbs = Array.from({ length: count }, (_, i) => {
    const t = (i + 1) / (count + 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t) + 3] as Pt;
  });
  return (
    <g key={key}>
      <path d={line(p)} fill="none" stroke={INK.frame} strokeWidth={1.1} />
      {bulbs.map(([x, y], i) => (
        <g key={i}>
          {lit ? <circle cx={n(x)} cy={n(y)} r={8} fill={c.url('halo')} /> : null}
          <circle cx={n(x)} cy={n(y)} r={2.8} fill={lit ? c.L.core : UNLIT.windowFill} stroke={lit ? c.L.glow : UNLIT.windowFrame} strokeWidth={0.9} />
        </g>
      ))}
    </g>
  );
}
