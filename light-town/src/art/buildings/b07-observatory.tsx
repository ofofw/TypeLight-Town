import type { ReactNode } from 'react';
import type { BuildingModule, ElemSpec, Kit } from './kit';
import { TONES, INK } from './materials';
import { P, n, line, sparklePath } from './iso';
import type { Pt } from './iso';
import { box, bulbFill, cylD, haloAt, glow, outset, pane, polyShape, roundGrad, archD } from './parts';

/** 观星台 Observatory: three stair lamps, then three dome segments; a star map appears above. */

const ZT = 64;
const RD = 38 / Math.SQRT2;
const dome = (alpha: number, phi: number): Pt => {
  const a = (alpha * Math.PI) / 180;
  const f = (phi * Math.PI) / 180;
  return P(RD * Math.cos(f) * Math.cos(a), RD * Math.cos(f) * Math.sin(a), ZT + RD * Math.sin(f));
};

function gore(a0: number, a1: number, phiMax = 90): Pt[] {
  const out: Pt[] = [];
  for (let f = 0; f <= phiMax; f += 15) out.push(dome(a0, f));
  for (let f = phiMax; f >= 0; f -= 15) out.push(dome(a1, f));
  for (let a = a1 - 10; a > a0; a -= 10) out.push(dome(a, 0));
  return out;
}

const GORES: [number, number][] = [
  [75, 135],
  [15, 75],
  [-45, 15],
];
const gorePts = GORES.map(([a0, a1]) => gore(a0, a1));

const STEP_LAMPS = [1, 3, 5].map((i) => {
  const x = -24 + 7 * i + 3.5;
  const z = 4 * (i + 1);
  return { foot: P(x, 34, z), head: P(x, 34, z + 16) };
});

const elems: ElemSpec[] = [
  ...STEP_LAMPS.map(({ head }) => ({ s: { k: 'rect', x: head[0] - 3.2, y: head[1] - 4, w: 6.4, h: 8, r: 1.6 } as const })),
  ...gorePts.map((p) => ({ s: polyShape(p), dots: { k: 'line', p: outset(p, 6), closed: true } as const })),
];

/** Original constellation: a little lantern-bearer zigzag. */
const STARS: [number, number, number][] = [
  [-62, 14, 4.5],
  [-38, -10, 6],
  [-14, 2, 4.5],
  [8, -26, 6.5],
  [34, -12, 5],
  [60, 8, 4.5],
  [18, 20, 4],
  [2, -54, 4.5],
];
const LINKS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [4, 6],
  [3, 7],
];
const FAINT: Pt[] = [
  [-80, -24],
  [-50, -46],
  [44, -50],
  [78, -30],
  [-26, 30],
  [70, 30],
];
const MAP = { x: 0, y: -196 };

function starMap(k: Kit): ReactNode {
  return (
    <g transform={`translate(${MAP.x} ${MAP.y})`}>
      <ellipse rx={98} ry={56} fill={k.url('halo')} opacity={0.5} />
      <ellipse rx={92} ry={50} fill="none" stroke={k.L.light} strokeWidth={1} strokeDasharray="2 6" opacity={0.45} />
      <g className={k.cls('lines')}>
        {LINKS.map(([a, b], i) => (
          <path key={i} d={line([[STARS[a][0], STARS[a][1]], [STARS[b][0], STARS[b][1]]])} stroke={k.L.core} strokeWidth={1.3} strokeLinecap="round" opacity={0.75} />
        ))}
      </g>
      {FAINT.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.6} fill={k.L.core} opacity={0.7} className={k.cls('tw')} style={k.animate ? { animationDelay: `${-i * 0.7}s` } : undefined} />
      ))}
      {STARS.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle r={r * 1.9} fill={k.url('halo')} />
          <g className={k.cls('star')} style={k.animate ? { animationDelay: `${-((i * 0.45) % 3.2)}s` } : undefined}>
            <path d={sparklePath(r)} fill={k.L.core} stroke={k.L.light} strokeWidth={0.6} />
          </g>
        </g>
      ))}
    </g>
  );
}

function draw(k: Kit) {
  const outline = 'M-38,-64 A38,32.9 0 0 1 38,-64 A38,19 0 0 1 -38,-64Z';
  const slit = gore(40, 50, 90);
  const scope0 = dome(45, 48);
  return (
    <g>
      <defs>
        {roundGrad(k.id('tower'), TONES.stone)}
        {roundGrad(k.id('dome'), TONES.metal)}
      </defs>
      {box(-28, -28, 28, 28, 0, 24, TONES.base)}
      <path d={line([P(-28, 28, 12), P(28, 28, 12), P(28, -28, 12)])} fill="none" stroke={TONES.base.edge} strokeWidth={1} opacity={0.35} />
      <path d={cylD(0, -24, 38, 0, 40)} fill={k.url('tower')} stroke={TONES.stone.edge} strokeWidth={1} strokeOpacity={0.7} />
      <path d="M-38,-44 A38,19 0 0 0 38,-44" fill="none" stroke={TONES.stone.edge} strokeWidth={1} opacity={0.35} />
      <path d={archD(16.5, -34, 11, 26)} fill={TONES.cream.left} />
      <path d={archD(18, -32.5, 8, 24)} fill={INK.door} />
      <path d={cylD(0, -24, 40, 38, 41)} fill={TONES.cream.left} />
      <path d={outline} fill={k.url('dome')} stroke={TONES.metal.edge} strokeWidth={1.2} strokeOpacity={0.8} />
      {[0, 1, 2].map((i) => glow(k, i + 3, elems[i + 3].s, 0.9, i))}
      {[0, 1, 2].map((i) => (
        <g key={i}>{pane(k, i + 3, elems[i + 3].s)}</g>
      ))}
      <g fill="none" stroke={TONES.metal.edge} strokeWidth={1.3} strokeLinejoin="round" opacity={0.9}>
        {[-45, 15, 75, 135].map((a) => (
          <path key={a} d={line([0, 15, 30, 45, 60, 75, 90].map((f) => dome(a, f)))} />
        ))}
        {[30, 60].map((f) => (
          <path key={f} d={line(Array.from({ length: 19 }, (_, i) => dome(-45 + i * 10, f)))} opacity={0.7} />
        ))}
      </g>
      <path d={line(slit, true)} fill="#141C40" stroke={TONES.metal.edge} strokeWidth={1} />
      <g transform={`translate(${n(scope0[0])} ${n(scope0[1])}) rotate(-38)`}>
        <rect x={-4} y={-4.5} width={34} height={9} rx={2} fill={TONES.metal.left} stroke={TONES.metal.edge} strokeWidth={0.8} />
        <rect x={26} y={-6} width={8} height={12} rx={2} fill={TONES.metal.top} stroke={TONES.metal.edge} strokeWidth={0.8} />
        <ellipse cx={34} cy={0} rx={2} ry={5} {...bulbFill(k, k.done)} />
      </g>
      <ellipse cx={n(dome(0, 90)[0])} cy={n(dome(0, 90)[1])} rx={7} ry={3.5} fill={TONES.metal.top} stroke={TONES.metal.edge} strokeWidth={0.8} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>{box(-24 + 7 * i, 28, -17 + 7 * i, 35, 0, 4 * (i + 1), TONES.stone)}</g>
      ))}
      {STEP_LAMPS.map(({ foot, head }, i) => (
        <g key={i}>
          <path d={`M${n(foot[0])},${n(foot[1])} L${n(head[0])},${n(head[1] + 4)}`} stroke={INK.frame} strokeWidth={1.6} strokeLinecap="round" />
          {haloAt(k, k.lit(i), head[0], head[1], 13)}
          <path d={`M${n(head[0] - 4.2)},${n(head[1] - 4)} L${n(head[0])},${n(head[1] - 7.5)} L${n(head[0] + 4.2)},${n(head[1] - 4)}Z`} fill={INK.frame} />
          {pane(k, i, elems[i].s)}
        </g>
      ))}
      {k.done ? starMap(k) : null}
    </g>
  );
}

function css(u: string): string {
  return `
.${u}-star{animation:${u}-star 3.2s ease-in-out infinite}
@keyframes ${u}-star{0%,100%{opacity:1}50%{opacity:.45}}
.${u}-lines{animation:${u}-lines 4.4s ease-in-out infinite}
@keyframes ${u}-lines{0%,100%{opacity:1}50%{opacity:.55}}
`;
}

export const observatory: BuildingModule = {
  elems,
  draw,
  css,
  spill: { cx: 0, cy: 22, rx: 96, ry: 24 },
  burst: [0, -60],
  top: -112,
};
