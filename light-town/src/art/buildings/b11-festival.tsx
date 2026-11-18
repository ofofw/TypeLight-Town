import type { ReactNode } from 'react';
import type { BuildingModule, ElemSpec, Kit, Shape } from './kit';
import { TONES, INK } from './materials';
import { LF, RF, P, apply, mat, n, line, pts } from './iso';
import type { Mat, Pt } from './iso';
import { box, bulbFill, edge, glow, pane, pyramid, archD } from './parts';

/** 节庆大厅 Festival Hall: three arched windows, three light chains; lanterns sway when the festival opens. */

const F = LF(20);
const S = RF(30);
const CF = LF(20.6);
const CS = RF(30.6);
const GOLD = '#C29A5B';

function sag(a: Pt, b: Pt, s: number, steps = 12): Pt[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + s * 4 * t * (1 - t)] as Pt;
  });
}
function at(a: Pt, b: Pt, s: number, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + s * 4 * t * (1 - t)];
}
function band(p: readonly Pt[], w: number): Pt[] {
  return [...p.map(([x, y]) => [x, y - w] as Pt), ...p
    .slice()
    .reverse()
    .map(([x, y]) => [x, y + w] as Pt)];
}
function bounds(p: readonly Pt[]): [number, number, number, number] {
  const xs = p.map((q) => q[0]);
  const ys = p.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
function bandShape(p: readonly Pt[], w: number, m?: Mat): Shape {
  const b = band(p, w);
  return { k: 'path', d: line(b, true), box: bounds(b), m };
}

const C1: [Pt, Pt, number] = [[-29, -64], [29, -64], 9];
const C2: [Pt, Pt, number] = [[-19, -64], [19, -64], 7];
const EAVE_L = P(-33, 23, 70);
const EAVE_R = P(33, -23, 70);
const POLE_L: Pt = [EAVE_L[0] + 1, EAVE_L[1] - 18];
const POLE_R: Pt = [EAVE_R[0] - 1, EAVE_R[1] - 18];
const MAST: Pt = [0, -150];
const c1 = sag(...C1);
const c2 = sag(...C2);
const c3l = sag(POLE_L, MAST, 7, 8);
const c3r = sag(MAST, POLE_R, 7, 8);
const c3: Pt[] = [...c3l, ...c3r.slice(1)];

const elems: ElemSpec[] = [
  { s: { k: 'arch', x: -26, y: -56, w: 12, h: 36, m: F } },
  { s: { k: 'arch', x: 14, y: -56, w: 12, h: 36, m: F } },
  { s: { k: 'arch', x: -7, y: -54, w: 14, h: 36, m: S } },
  { s: bandShape(c1, 4.5, CF), dots: { k: 'line', p: band(c1, 9).map(([u, v]) => apply(CF, u, v)), closed: true } },
  { s: bandShape(c2, 4.5, CS), dots: { k: 'line', p: band(c2, 9).map(([u, v]) => apply(CS, u, v)), closed: true } },
  {
    s: { k: 'path', d: line(band(c3l, 4.5), true) + line(band(c3r, 4.5), true), box: bounds(band(c3, 4.5)) },
    dots: { k: 'line', p: c3 },
  },
];

function bulbs(k: Kit, i: number, list: readonly Pt[]): ReactNode {
  const on = k.lit(i);
  return list.map(([x, y], j) => <circle key={j} cx={n(x)} cy={n(y + 2)} r={2.4} {...bulbFill(k, on)} />);
}

/** Soft glow along a lit light chain (one element instead of a halo per bulb). */
function chainGlow(k: Kit, i: number, d: string): ReactNode {
  if (!k.lit(i)) return null;
  return <path d={d} fill="none" stroke={k.L.light} strokeOpacity={0.3} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />;
}

function chain(k: Kit, i: number, p: readonly Pt[], count: number, m?: Mat): ReactNode {
  const spots = Array.from({ length: count }, (_, j) => p[Math.round(((j + 1) * (p.length - 1)) / (count + 1))]);
  return (
    <g transform={m ? mat(m) : undefined}>
      {chainGlow(k, i, line(p.map(([x, y]) => [x, y + 2] as Pt)))}
      <path d={line(p)} fill="none" stroke={INK.frame} strokeWidth={1} />
      {bulbs(k, i, spots)}
    </g>
  );
}

const LANTERN_COLORS = [INK.flagA, INK.flagC, INK.flagB, INK.flagD, INK.flagA];

function lantern(k: Kit, idx: number): ReactNode {
  const cap = LANTERN_COLORS[idx % LANTERN_COLORS.length];
  return (
    <g>
      <circle cx={0} cy={11} r={11} fill={k.url('halo')} />
      <ellipse cx={0} cy={11} rx={5} ry={6.5} fill={k.url('lit')} stroke={cap} strokeWidth={1.2} />
      <path d="M0,0 L0,4 M-3.4,6 Q0,11 -3.4,16 M3.4,6 Q0,11 3.4,16" fill="none" stroke={cap} strokeWidth={0.8} />
      <path d="M-3,3.5 h6 v2.4 h-6Z M-3,16.2 h6 v2.4 h-6Z" fill={cap} />
    </g>
  );
}

function lanterns(k: Kit): ReactNode {
  const spots: { m: Mat; p: Pt }[] = [
    ...[0.25, 0.5, 0.75].map((t) => ({ m: CF, p: at(...C1, t) })),
    ...[0.32, 0.68].map((t) => ({ m: CS, p: at(...C2, t) })),
  ];
  return spots.map(({ m, p }, i) => (
    <g key={i} transform={`${mat(m)} translate(${n(p[0])} ${n(p[1])})`}>
      {k.animate ? (
        <g className={k.cls('lsw')} style={{ animationDelay: `${-i * 0.9}s` }}>
          {lantern(k, i)}
        </g>
      ) : (
        <g transform={`rotate(${i % 2 ? 6 : -6})`}>{lantern(k, i)}</g>
      )}
    </g>
  ));
}

function bunting(): ReactNode {
  const colors = [INK.flagA, INK.flagB, INK.flagC, INK.flagD];
  const paths = ['', '', '', ''];
  for (let i = 0; i < c3.length - 1; i += 1) {
    if (i === c3l.length - 1) continue;
    const [x0, y0] = c3[i];
    const [x1, y1] = c3[i + 1];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    paths[i % 4] += `M${n(mx - 3.4)},${n(my)} L${n(mx + 3.4)},${n(my)} L${n(mx)},${n(my + 7)}Z`;
  }
  return (
    <g>
      {paths.map((d, i) => (
        <path key={i} d={d} fill={colors[i]} />
      ))}
    </g>
  );
}

function stripedRoof(): ReactNode {
  const a = P(-33, 23, 70);
  const b = P(33, 23, 70);
  const c = P(33, -23, 70);
  const r0 = P(-10, 0, 112);
  const r1 = P(10, 0, 112);
  const lerp = (p: Pt, q: Pt, t: number): Pt => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const front: ReactNode[] = [];
  for (let i = 0; i < 8; i += 1) {
    const q = [lerp(a, b, i / 8), lerp(a, b, (i + 1) / 8), lerp(r0, r1, (i + 1) / 8), lerp(r0, r1, i / 8)];
    front.push(<polygon key={i} points={pts(q)} fill={i % 2 ? TONES.roofRed.top : TONES.cream.top} />);
  }
  const side: ReactNode[] = [];
  for (let i = 0; i < 4; i += 1) {
    const q = [lerp(b, c, i / 4), lerp(b, c, (i + 1) / 4), r1];
    side.push(<polygon key={i} points={pts(q)} fill={i % 2 ? TONES.cream.right : TONES.roofRed.right} />);
  }
  const drop = (p: Pt): Pt => [p[0], p[1] + 3];
  return (
    <g>
      <polygon points={pts([a, b, drop(b), drop(a)])} fill={GOLD} />
      <polygon points={pts([b, c, drop(c), drop(b)])} fill="#8E6A3C" />
      {front}
      {side}
      <path d={line([a, b, c, r1, r0], true)} {...edge(TONES.roofRed)} />
      <path d={line([b, r1])} {...edge(TONES.roofRed, 1, 0.6)} />
    </g>
  );
}

function draw(k: Kit) {
  return (
    <g>
      {box(-32, -22, 32, 22, 0, 6, TONES.base)}
      {box(-8, 22, 8, 27, 0, 3, TONES.stone)}
      {box(-30, -20, 30, 20, 6, 70, TONES.rose, undefined, { top: false })}
      <g transform={mat(F)}>
        <rect x={-30} y={-70} width={60} height={4} fill={GOLD} opacity={0.8} />
        <path d={archD(-28, -58, 16, 40)} fill={TONES.cream.left} />
        <path d={archD(12, -58, 16, 40)} fill={TONES.cream.left} />
        <path d={archD(-10, -46, 20, 40)} fill={GOLD} />
        <path d={archD(-8, -44, 16, 38)} fill={TONES.roofRed.right} />
        <path d="M0,-36 L0,-6" stroke="#5E2E48" strokeWidth={1.2} />
        <circle cx={-2.5} cy={-20} r={1.1} fill={GOLD} />
        <circle cx={2.5} cy={-20} r={1.1} fill={GOLD} />
      </g>
      <g transform={mat(S)}>
        <rect x={-20} y={-70} width={40} height={4} fill="#8E6A3C" opacity={0.8} />
        <path d={archD(-9, -56, 18, 40)} fill={TONES.cream.right} />
      </g>
      {[0, 1, 2].map((i) => glow(k, i, elems[i].s, 1.5, i))}
      {[0, 1, 2].map((i) => (
        <g key={i}>{pane(k, i, elems[i].s)}</g>
      ))}
      <g transform={mat(F)} stroke={INK.frame} strokeWidth={1} opacity={0.5}>
        <path d="M-20,-50 L-20,-20 M20,-50 L20,-20 M-26,-34 L-14,-34 M14,-34 L26,-34" />
      </g>
      <g transform={mat(S)} stroke={INK.frame} strokeWidth={1} opacity={0.5}>
        <path d="M0,-47 L0,-18 M-7,-32 L7,-32" />
      </g>
      {chain(k, 3, c1, 9, CF)}
      {chain(k, 4, c2, 7, CS)}
      {k.done ? lanterns(k) : null}
      {stripedRoof()}
      {box(-6, -5, 6, 5, 106, 120, TONES.cream)}
      {pyramid(-6, -5, 6, 5, 120, 133, TONES.roofRed, 1.5)}
      <path d={line([P(0, 0, 133), [MAST[0], MAST[1] - 8]])} stroke={TONES.metal.edge} strokeWidth={1.5} />
      <path d={`M0,${MAST[1] - 8} L20,${MAST[1] - 3} L0,${MAST[1] + 2}Z`} fill={INK.flagB} />
      {[EAVE_L, EAVE_R].map((p, i) => (
        <g key={i}>
          <path d={`M${n(p[0])},${n(p[1])} L${n(p[0])},${n(p[1] - 22)}`} stroke={TONES.metal.edge} strokeWidth={1.3} />
          <path d={`M${n(p[0])},${n(p[1] - 22)} l13,4 l-13,4Z`} fill={i ? INK.flagC : INK.flagA} />
        </g>
      ))}
      {chainGlow(k, 5, line(c3l) + line(c3r))}
      <path d={line(c3l)} fill="none" stroke={INK.frame} strokeWidth={1} />
      <path d={line(c3r)} fill="none" stroke={INK.frame} strokeWidth={1} />
      {k.done ? bunting() : null}
      {bulbs(k, 5, [...c3l.slice(1, -1).filter((_, j) => j % 2 === 0), ...c3r.slice(1, -1).filter((_, j) => j % 2 === 1)])}
    </g>
  );
}

function css(u: string): string {
  return `
.${u}-lsw{transform-box:view-box;transform-origin:0 0;animation:${u}-lsw 3.2s ease-in-out infinite}
@keyframes ${u}-lsw{0%,100%{transform:rotate(-9deg)}50%{transform:rotate(9deg)}}
`;
}

export const festivalHall: BuildingModule = {
  elems,
  draw,
  css,
  spill: { cx: 0, cy: 22, rx: 100, ry: 24 },
  burst: [0, -80],
  top: -160,
};
