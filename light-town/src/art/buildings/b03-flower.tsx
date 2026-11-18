import type { ReactNode } from 'react';
import type { BuildingModule, ElemSpec, Kit, Shape } from './kit';
import { TONES, INK } from './materials';
import { LF, RF, P, apply, mat, n, line } from './iso';
import type { Pt } from './iso';
import { box, bulbFill, glow, haloAt, outset, pane, polyShape } from './parts';

/** 花房 Flower House: three glowing pot flowers, then front glass, side glass and the glass vault. */

const X0 = -32;
const X1 = 32;
const ZW = 50;
const PROFILE: Pt[] = Array.from({ length: 7 }, (_, i) => {
  const a = (Math.PI * i) / 6;
  return [20 * Math.cos(a), ZW + 23 * Math.sin(a)] as Pt;
});
const FRONT = LF(20);
const SIDE = RF(X1);

const POTS: Pt[] = [P(-24, 27), P(-6, 27.5), P(12, 27)];
const BULB_UP = 23;
const PETALS = ['#EE82A6', '#B7A0F2', '#F2C45A'];

const vaultPts: Pt[] = [
  ...PROFILE.slice(0, 6).map(([y, z]) => P(X1, y, z)),
  ...PROFILE.slice(0, 6)
    .reverse()
    .map(([y, z]) => P(X0, y, z)),
];
const sideLocal: Pt[] = [[-20, -14], [20, -14], ...PROFILE.slice()
  .reverse()
  .map(([y, z]) => [-y, -z] as Pt)];
const sideShape: Shape = {
  k: 'path',
  d: line(sideLocal, true),
  box: [-20, -73, 20, -14],
  m: SIDE,
};
const frontShape: Shape = { k: 'rect', x: X0, y: -ZW, w: X1 - X0, h: ZW - 14, m: FRONT };
const frontScreen: Pt[] = [apply(FRONT, X0, -14), apply(FRONT, X1, -14), apply(FRONT, X1, -ZW), apply(FRONT, X0, -ZW)];

const elems: ElemSpec[] = [
  ...POTS.map(([x, y]) => ({ s: { k: 'ell', cx: x, cy: y - BULB_UP, rx: 4.4, ry: 4.4 } as Shape })),
  { s: frontShape, dots: { k: 'line', p: outset(frontScreen, 7), closed: true } },
  { s: sideShape, dots: { k: 'line', p: outset(sideLocal.map(([u, v]) => apply(SIDE, u, v)), 7), closed: true } },
  { s: polyShape(vaultPts), dots: { k: 'line', p: outset(vaultPts, 7), closed: true } },
];

function leaves(lit: boolean, spots: [number, number, number][]): ReactNode {
  return spots.map(([u, v, s], i) => (
    <g key={i} fill={lit ? INK.leafDark : '#25506B'} opacity={lit ? 0.9 : 0.75}>
      <ellipse cx={u - 3 * s} cy={v} rx={2.6 * s} ry={6 * s} transform={`rotate(-28 ${u - 3 * s} ${v})`} />
      <ellipse cx={u + 3 * s} cy={v - 1} rx={2.6 * s} ry={6.5 * s} transform={`rotate(24 ${u + 3 * s} ${v - 1})`} />
      <ellipse cx={u} cy={v - 4 * s} rx={2.4 * s} ry={7 * s} />
    </g>
  ));
}

function flower(k: Kit, i: number): ReactNode {
  const [x, y] = POTS[i];
  const by = y - BULB_UP;
  const lit = k.lit(i);
  const petals = (
    <g>
      {[0, 1, 2, 3, 4].map((j) => (
        <ellipse key={j} cx={0} cy={-5.6} rx={2.9} ry={5} fill={PETALS[i]} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={0.6} transform={`rotate(${j * 72})`} />
      ))}
    </g>
  );
  return (
    <g key={i}>
      <path d={`M${n(x - 4.6)},${n(y - 9)} L${n(x + 4.6)},${n(y - 9)} L${n(x + 3.4)},${n(y)} L${n(x - 3.4)},${n(y)}Z`} fill={TONES.roofRed.left} />
      <ellipse cx={n(x)} cy={n(y - 9)} rx={5.2} ry={2.2} fill={TONES.roofRed.top} />
      <path d={`M${n(x)},${n(y - 9)} L${n(x)},${n(by + 3)}`} stroke={INK.leaf} strokeWidth={1.3} />
      <ellipse cx={n(x - 3)} cy={n(y - 14)} rx={3.2} ry={1.6} fill={INK.leaf} transform={`rotate(-25 ${n(x - 3)} ${n(y - 14)})`} />
      <ellipse cx={n(x + 3)} cy={n(y - 16)} rx={3.2} ry={1.6} fill={INK.leafDark} transform={`rotate(25 ${n(x + 3)} ${n(y - 16)})`} />
      {haloAt(k, lit, x, by, 13)}
      {k.done ? (
        <g transform={`translate(${n(x)} ${n(by)})`}>
          {k.animate ? (
            <g className={k.cls('bloom')} style={{ animationDelay: `${-i * 1.3}s` }}>
              {petals}
            </g>
          ) : (
            petals
          )}
        </g>
      ) : null}
      <circle cx={n(x)} cy={n(by)} r={4.4} {...bulbFill(k, lit)} />
      {lit ? <circle cx={n(x - 1.2)} cy={n(by - 1.3)} r={1.4} fill="#FFFFFF" opacity={0.8} /> : null}
    </g>
  );
}

function draw(k: Kit) {
  const ribsX = [X0, -16, 0, 16, X1];
  const frame = INK.frameLight;
  return (
    <g>
      {box(-34, -22, 34, 22, 0, 4, TONES.base)}
      {box(X0, -20, X1, 20, 4, 14, TONES.brick, undefined, { top: false })}
      {glow(k, 3, frontShape, 1.05)}
      {glow(k, 4, sideShape, 1.1)}
      {glow(k, 5, elems[5].s, 1.05)}
      {pane(k, 3, frontShape)}
      {pane(k, 4, sideShape)}
      <g transform={mat(FRONT)}>
        {leaves(k.lit(3), [
          [-24, -20, 1],
          [-6, -22, 1.2],
          [14, -20, 1],
          [26, -24, 0.8],
        ])}
      </g>
      <g transform={mat(SIDE)}>
        {leaves(k.lit(4), [
          [-12, -21, 1],
          [12, -20, 1.1],
        ])}
      </g>
      <g transform={mat(FRONT)} stroke={frame} strokeWidth={1.4} fill="none" strokeLinejoin="round">
        <rect x={X0} y={-ZW} width={X1 - X0} height={ZW - 14} />
        <path d="M-16,-50 L-16,-14 M0,-50 L0,-14 M16,-50 L16,-14 M-32,-31 L32,-31" />
      </g>
      <g transform={mat(SIDE)} stroke={frame} strokeWidth={1.4} fill="none" strokeLinejoin="round">
        <path d={line(sideLocal, true)} />
        <path d="M-6.5,-50 L-6.5,-14 M6.5,-50 L6.5,-14 M-20,-31 L20,-31 M-20,-50 L20,-50 M0,-50 L0,-73" />
        <rect x={-5} y={-40} width={10} height={26} />
      </g>
      <g transform={mat(SIDE)}>
        <rect x={-5} y={-14} width={10} height={10} fill={INK.awningB} />
        <circle cx={3} cy={-24} r={0.9} fill={frame} />
      </g>
      {pane(k, 5, elems[5].s)}
      {k.lit(5) ? (
        <g opacity={0.9}>
          {leaves(true, [
            [-14, -52, 0.7],
            [10, -42, 0.7],
          ])}
        </g>
      ) : null}
      <g stroke={frame} strokeWidth={1.3} fill="none" strokeLinejoin="round">
        {ribsX.map((x) => (
          <path key={x} d={line(PROFILE.slice(0, 6).map(([y, z]) => P(x, y, z)))} />
        ))}
        {[1, 2, 3, 4].map((i) => (
          <path key={i} d={line([P(X0, PROFILE[i][0], PROFILE[i][1]), P(X1, PROFILE[i][0], PROFILE[i][1])])} />
        ))}
        <path d={line([P(X0, 20, ZW), P(X1, 20, ZW)])} strokeWidth={2} />
      </g>
      <path d={line([P(0, 0, 73), P(0, 0, 92)])} stroke={TONES.metal.edge} strokeWidth={1.3} />
      <g transform={`translate(0 ${-92})`}>
        {[0, 1, 2, 3, 4].map((j) => (
          <circle key={j} cx={n(3 * Math.sin((j * Math.PI * 2) / 5))} cy={n(-3 * Math.cos((j * Math.PI * 2) / 5))} r={2} fill={INK.flagA} />
        ))}
        <circle r={1.6} fill={INK.flagB} />
      </g>
      {POTS.map((_, i) => flower(k, i))}
    </g>
  );
}

function css(u: string): string {
  return `
.${u}-bloom{transform-box:view-box;transform-origin:0 0;animation:${u}-bloom 5s ease-in-out infinite}
@keyframes ${u}-bloom{0%,100%{transform:scale(.6) rotate(-14deg)}50%{transform:scale(1.08) rotate(10deg)}}
`;
}

export const flowerHouse: BuildingModule = {
  elems,
  draw,
  css,
  spill: { cx: -10, cy: 22, rx: 100, ry: 24 },
  burst: [0, -45],
  top: -98,
};
