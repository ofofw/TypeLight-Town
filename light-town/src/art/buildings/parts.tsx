import type { ReactNode } from 'react';
import { UNLIT } from '../palette';
import type { Kit, Shape, ElemSpec } from './kit';
import type { Tone } from './materials';
import { P, apply, boxEdges, boxFaces, IDENT, line, mat, mul, n, pts, scaleAbout } from './iso';
import type { Pt } from './iso';

/** Paint attributes that are valid on every SVG shape element. */
export interface Paint {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  strokeOpacity?: number;
  fillOpacity?: number;
  opacity?: number;
  strokeLinejoin?: 'round' | 'miter' | 'bevel';
  strokeLinecap?: 'round' | 'butt' | 'square';
  className?: string;
}

export function edge(t: Tone, w = 1.1, o = 0.75): Paint {
  return { fill: 'none', stroke: t.edge, strokeWidth: w, strokeOpacity: o, strokeLinejoin: 'round', strokeLinecap: 'round' };
}

export function archD(x: number, y: number, w: number, h: number): string {
  const r = w / 2;
  const top = y + Math.min(r, h);
  return `M${n(x)},${n(y + h)} L${n(x)},${n(top)} A${n(r)},${n(r)} 0 0 1 ${n(x + w)},${n(top)} L${n(x + w)},${n(y + h)}Z`;
}

/** Render a Shape (optionally grown by `pad` local units) with the given paint. */
export function shapeEl(s: Shape, paint: Paint, pad = 0, key?: string | number): ReactNode {
  const tf = s.m ? mat(s.m) : undefined;
  switch (s.k) {
    case 'rect':
      return (
        <rect
          key={key}
          x={n(s.x - pad)}
          y={n(s.y - pad)}
          width={n(s.w + 2 * pad)}
          height={n(s.h + 2 * pad)}
          rx={s.r !== undefined ? n(s.r + pad) : undefined}
          transform={tf}
          {...paint}
        />
      );
    case 'ell':
      return <ellipse key={key} cx={n(s.cx)} cy={n(s.cy)} rx={n(s.rx + pad)} ry={n(s.ry + pad)} transform={tf} {...paint} />;
    case 'arch':
      return <path key={key} d={archD(s.x - pad, s.y - pad, s.w + 2 * pad, s.h + 2 * pad)} transform={tf} {...paint} />;
    case 'path': {
      const [x0, y0, x1, y1] = s.box;
      const grow = pad
        ? scaleAbout((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0 + 2 * pad) / (x1 - x0), (y1 - y0 + 2 * pad) / (y1 - y0))
        : IDENT;
      const m = mul(s.m ?? IDENT, grow);
      return <path key={key} d={s.d} transform={mat(m)} {...paint} />;
    }
  }
}

function localBox(s: Shape): [number, number, number, number] {
  switch (s.k) {
    case 'rect':
    case 'arch':
      return [s.x, s.y, s.x + s.w, s.y + s.h];
    case 'ell':
      return [s.cx - s.rx, s.cy - s.ry, s.cx + s.rx, s.cy + s.ry];
    case 'path':
      return [s.box[0], s.box[1], s.box[2], s.box[3]];
  }
}

/** Screen-space centre and half extents of a shape. */
export function screenBox(s: Shape): { cx: number; cy: number; hw: number; hh: number } {
  const [x0, y0, x1, y1] = localBox(s);
  const m = s.m ?? IDENT;
  const c = [apply(m, x0, y0), apply(m, x1, y0), apply(m, x1, y1), apply(m, x0, y1)];
  const xs = c.map((p) => p[0]);
  const ys = c.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  if (s.k === 'ell' || s.k === 'arch') {
    // The skewed corners overshoot a round outline; shrink a little for a snugger fit.
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return { cx, cy, hw: ((maxX - minX) / 2) * 0.9, hh: ((maxY - minY) / 2) * 0.85 };
  }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, hw: (maxX - minX) / 2, hh: (maxY - minY) / 2 };
}

/** A window pane / light body: lit fill or dark outlined glass. */
export function pane(k: Kit, i: number, s: Shape, key?: string | number): ReactNode {
  return shapeEl(
    s,
    k.lit(i)
      ? { fill: k.url('lit'), stroke: k.L.glow, strokeWidth: 1 }
      : { fill: UNLIT.windowFill, stroke: UNLIT.windowFrame, strokeWidth: 1.3 },
    0,
    key,
  );
}

/** Soft halo behind a lit element (nothing when unlit). */
export function glow(k: Kit, i: number, s: Shape, scale = 1.8, key?: string | number): ReactNode {
  if (!k.lit(i)) return null;
  const b = screenBox(s);
  return <ellipse key={key} cx={n(b.cx)} cy={n(b.cy)} rx={n(b.hw * scale + 6)} ry={n(b.hh * scale + 6)} fill={k.url('halo')} />;
}

/** Halo at an explicit spot. */
export function haloAt(k: Kit, on: boolean, cx: number, cy: number, rx: number, ry = rx, key?: string | number): ReactNode {
  if (!on) return null;
  return <ellipse key={key} cx={n(cx)} cy={n(cy)} rx={n(rx)} ry={n(ry)} fill={k.url('halo')} />;
}

/** Fill for a small bulb / light dot. */
export function bulbFill(k: Kit, on: boolean): Paint {
  return on
    ? { fill: k.L.core, stroke: k.L.glow, strokeWidth: 0.9 }
    : { fill: UNLIT.windowFill, stroke: UNLIT.windowFrame, strokeWidth: 1 };
}

export function box(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  z1: number,
  t: Tone,
  key?: string | number,
  o: { top?: boolean; edges?: boolean } = {},
): ReactNode {
  const f = boxFaces(x0, y0, x1, y1, z0, z1);
  return (
    <g key={key}>
      <polygon points={pts(f.left)} fill={t.left} />
      <polygon points={pts(f.right)} fill={t.right} />
      {o.top === false ? null : <polygon points={pts(f.top)} fill={t.top} />}
      {o.edges === false ? null : <path d={boxEdges(x0, y0, x1, y1, z0, z1)} {...edge(t)} />}
    </g>
  );
}

/** Polygon from world points. */
export function face(list: readonly Pt[], fill: string, key?: string | number, extra: Paint = {}): ReactNode {
  return <polygon key={key} points={pts(list)} fill={fill} {...extra} />;
}

/**
 * Steep gable roof over walls x0..x1 × y0..y1 (eaves at z0), ridge along x at height zr.
 * Gable end on the right (+x) face, front slope facing +y.
 */
export function gableX(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  zr: number,
  roof: Tone,
  wall: Tone,
  ov = 5,
  t = 4,
): ReactNode {
  const yc = (y0 + y1) / 2;
  const slope = (zr - z0) / (y1 - yc);
  const ze = z0 - ov * slope;
  const xa = x0 - ov;
  const xb = x1 + ov;
  const front = [P(xa, y1 + ov, ze), P(xb, y1 + ov, ze), P(xb, yc, zr), P(xa, yc, zr)];
  const verge = [
    P(xb, y1 + ov, ze),
    P(xb, yc, zr),
    P(xb, y0 - ov, ze),
    P(xb, y0 - ov, ze - t),
    P(xb, yc, zr - t),
    P(xb, y1 + ov, ze - t),
  ];
  const fascia = [P(xa, y1 + ov, ze), P(xb, y1 + ov, ze), P(xb, y1 + ov, ze - t), P(xa, y1 + ov, ze - t)];
  const rows: ReactNode[] = [];
  for (let i = 1; i < 5; i += 1) {
    const yy = y1 + ov - ((y1 + ov - yc) * i) / 5;
    const zz = ze + (zr - ze) * (i / 5);
    rows.push(<path key={i} d={line([P(xa + 1, yy, zz), P(xb - 1, yy, zz)])} stroke={roof.edge} strokeOpacity={0.28} strokeWidth={1} />);
  }
  return (
    <g>
      {face([P(x1, y1, z0), P(x1, y0, z0), P(x1, yc, zr)], wall.right)}
      <path d={line([P(x1, y1, z0), P(x1, yc, zr), P(x1, y0, z0)])} {...edge(wall)} />
      {face(front, roof.top)}
      {rows}
      {face(fascia, roof.left)}
      {face(verge, roof.right)}
      <path d={line(front, true)} {...edge(roof)} />
      <path d={line(verge, true)} {...edge(roof, 1, 0.6)} />
    </g>
  );
}

/**
 * Steep gable roof with the ridge along y: gable end on the front (+y) face, slope facing +x.
 */
export function gableY(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  zr: number,
  roof: Tone,
  wall: Tone,
  ov = 5,
  t = 4,
): ReactNode {
  const xc = (x0 + x1) / 2;
  const slope = (zr - z0) / (x1 - xc);
  const ze = z0 - ov * slope;
  const ya = y0 - ov;
  const yb = y1 + ov;
  const side = [P(x1 + ov, yb, ze), P(x1 + ov, ya, ze), P(xc, ya, zr), P(xc, yb, zr)];
  const verge = [
    P(x0 - ov, yb, ze),
    P(xc, yb, zr),
    P(x1 + ov, yb, ze),
    P(x1 + ov, yb, ze - t),
    P(xc, yb, zr - t),
    P(x0 - ov, yb, ze - t),
  ];
  const fascia = [P(x1 + ov, yb, ze), P(x1 + ov, ya, ze), P(x1 + ov, ya, ze - t), P(x1 + ov, yb, ze - t)];
  const rows: ReactNode[] = [];
  for (let i = 1; i < 5; i += 1) {
    const xx = x1 + ov - ((x1 + ov - xc) * i) / 5;
    const zz = ze + (zr - ze) * (i / 5);
    rows.push(<path key={i} d={line([P(xx, yb - 1, zz), P(xx, ya + 1, zz)])} stroke={roof.edge} strokeOpacity={0.28} strokeWidth={1} />);
  }
  return (
    <g>
      {face([P(x0, y1, z0), P(x1, y1, z0), P(xc, y1, zr)], wall.left)}
      <path d={line([P(x0, y1, z0), P(xc, y1, zr), P(x1, y1, z0)])} {...edge(wall)} />
      {face(side, roof.top)}
      {rows}
      {face(fascia, roof.right)}
      {face(verge, roof.left)}
      <path d={line(side, true)} {...edge(roof)} />
      <path d={line(verge, true)} {...edge(roof, 1, 0.6)} />
    </g>
  );
}

/** Hip (pyramid) roof: two visible triangular faces. */
export function pyramid(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  zApex: number,
  roof: Tone,
  ov = 4,
): ReactNode {
  const apex = P((x0 + x1) / 2, (y0 + y1) / 2, zApex);
  const a = P(x0 - ov, y1 + ov, z0);
  const b = P(x1 + ov, y1 + ov, z0);
  const c = P(x1 + ov, y0 - ov, z0);
  return (
    <g>
      {face([a, b, apex], roof.left)}
      {face([b, c, apex], roof.right)}
      <path d={line([a, b, c, apex], true)} {...edge(roof)} />
      <path d={line([b, apex])} {...edge(roof, 1, 0.6)} />
    </g>
  );
}

/** Steep hip roof with a short ridge along x (hips at 45° in plan). */
export function hip(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  zr: number,
  roof: Tone,
  ov = 3,
  t = 3,
): ReactNode {
  const yc = (y0 + y1) / 2;
  const d = (y1 - y0) / 2;
  const a = P(x0 - ov, y1 + ov, z0);
  const b = P(x1 + ov, y1 + ov, z0);
  const c = P(x1 + ov, y0 - ov, z0);
  const r0 = P(x0 + d, yc, zr);
  const r1 = P(x1 - d, yc, zr);
  const drop = (list: readonly Pt[]) => list.map((p) => [p[0], p[1] + t] as Pt);
  return (
    <g>
      {face([a, b, ...drop([b, a])], roof.left)}
      {face([b, c, ...drop([c, b])], roof.right)}
      {face([a, b, r1, r0], roof.top)}
      {face([b, c, r1], roof.right)}
      <path d={line([a, b, c, r1, r0], true)} {...edge(roof)} />
      <path d={line([b, r1])} {...edge(roof, 1, 0.6)} />
    </g>
  );
}

/** Vertical cylinder body path (screen centre sx, ground sy, screen radius r, heights z0..z1). */
export function cylD(sx: number, sy: number, r: number, z0: number, z1: number): string {
  const yt = sy - z1;
  const yb = sy - z0;
  return `M${n(sx - r)},${n(yt)} L${n(sx - r)},${n(yb)} A${n(r)},${n(r / 2)} 0 0 0 ${n(sx + r)},${n(yb)} L${n(sx + r)},${n(yt)} A${n(r)},${n(r / 2)} 0 0 1 ${n(sx - r)},${n(yt)}Z`;
}

/** Truncated cone (radius r0 at z0, r1 at z1). */
export function coneD(sx: number, sy: number, r0: number, r1: number, z0: number, z1: number): string {
  const yt = sy - z1;
  const yb = sy - z0;
  return `M${n(sx - r1)},${n(yt)} L${n(sx - r0)},${n(yb)} A${n(r0)},${n(r0 / 2)} 0 0 0 ${n(sx + r0)},${n(yb)} L${n(sx + r1)},${n(yt)} A${n(r1)},${n(r1 / 2)} 0 0 1 ${n(sx - r1)},${n(yt)}Z`;
}

/** Horizontal shading gradient for round bodies (left lit, right in shade). */
export function roundGrad(id: string, t: Tone): ReactNode {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={t.left} />
      <stop offset="0.38" stopColor={t.top} />
      <stop offset="0.62" stopColor={t.left} />
      <stop offset="1" stopColor={t.right} />
    </linearGradient>
  );
}

/** Climbing ivy along a polyline (local coordinates), leaves alternating sides. */
export function vine(path: readonly Pt[], leafEvery = 9, size = 1): ReactNode {
  const leaves: ReactNode[] = [];
  let acc = 0;
  let side = 1;
  for (let i = 1; i < path.length; i += 1) {
    const [x0, y0] = path[i - 1];
    const [x1, y1] = path[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (let t = leafEvery - acc; t < len; t += leafEvery) {
      const f = t / len;
      const x = x0 + (x1 - x0) * f;
      const y = y0 + (y1 - y0) * f;
      side = -side;
      leaves.push(
        <ellipse
          key={leaves.length}
          cx={n(x + side * 3 * size)}
          cy={n(y)}
          rx={n(3.2 * size)}
          ry={n(2 * size)}
          fill={leaves.length % 3 === 0 ? '#2C7D6E' : '#3FA48E'}
          transform={`rotate(${side * 30} ${n(x + side * 3 * size)} ${n(y)})`}
        />,
      );
    }
    acc = (acc + len) % leafEvery;
  }
  return (
    <g>
      <path d={line(path)} fill="none" stroke="#2C6E62" strokeWidth={1.2 * size} strokeLinecap="round" strokeLinejoin="round" />
      {leaves}
    </g>
  );
}

/** A closed polygon (screen coordinates) as an element Shape. */
export function polyShape(list: readonly Pt[]): Shape {
  const xs = list.map((p) => p[0]);
  const ys = list.map((p) => p[1]);
  return { k: 'path', d: line(list, true), box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}

/** Outset a convex-ish polygon from its centroid (for dot paths around big elements). */
export function outset(list: readonly Pt[], by: number): Pt[] {
  const cx = list.reduce((s, p) => s + p[0], 0) / list.length;
  const cy = list.reduce((s, p) => s + p[1], 0) / list.length;
  return list.map((p) => {
    const dx = p[0] - cx;
    const dy = p[1] - cy;
    const l = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / l) * by, p[1] + (dy / l) * by] as Pt;
  });
}

/** Evenly spaced positions for the temporary light dots of an element. */
export function dotPositions(e: ElemSpec, max: number): Pt[] {
  const out: Pt[] = [];
  const d = e.dots;
  if (d && d.k === 'line') {
    const p = d.closed ? [...d.p, d.p[0]] : [...d.p];
    const seg: number[] = [];
    let total = 0;
    for (let i = 1; i < p.length; i += 1) {
      const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      seg.push(l);
      total += l;
    }
    for (let i = 0; i < max; i += 1) {
      let t = (d.closed ? i / max : (i + 0.5) / max) * total;
      let j = 0;
      while (j < seg.length - 1 && t > seg[j]) {
        t -= seg[j];
        j += 1;
      }
      const f = seg[j] === 0 ? 0 : Math.min(1, t / seg[j]);
      out.push([p[j][0] + (p[j + 1][0] - p[j][0]) * f, p[j][1] + (p[j + 1][1] - p[j][1]) * f]);
    }
    return out;
  }
  let cx: number;
  let cy: number;
  let rx: number;
  let ry: number;
  if (d && d.k === 'ring') {
    ({ cx, cy, rx, ry } = d);
  } else {
    const b = screenBox(e.s);
    cx = b.cx;
    cy = b.cy;
    rx = Math.max(Math.hypot(b.hw, b.hh) + 7, 20);
    ry = rx;
  }
  const spacing = 7.6;
  const rings = Math.max(1, Math.ceil((max * spacing) / (2 * Math.PI * Math.max(rx, 36))));
  const per = Math.ceil(max / rings);
  for (let i = 0; i < max; i += 1) {
    const ring = Math.floor(i / per);
    const idx = i - ring * per;
    const count = Math.min(per, max - ring * per);
    const grow = Math.max(0, (count * spacing) / (2 * Math.PI) - rx) + ring * 8;
    const a = -Math.PI / 2 + (2 * Math.PI * idx) / count + ring * 0.13;
    out.push([cx + Math.cos(a) * (rx + grow), cy + Math.sin(a) * (ry + grow)]);
  }
  return out;
}
