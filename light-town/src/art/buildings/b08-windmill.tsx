import type { ReactNode } from 'react';
import type { BuildingModule, ElemSpec, Kit } from './kit';
import { TONES, INK } from './materials';
import { LF, apply, mat, mul, n, translate } from './iso';
import type { Mat, Pt } from './iso';
import { bulbFill, coneD, cylD, glow, outset, pane, roundGrad, archD } from './parts';

/** 风车坊 Windmill: two tower windows, then the lights of each of the four sails; the sails turn. */

const HUB_Z = 132;
const FACE = LF(24);
const HUB: Mat = mul(FACE, translate(0, -HUB_Z));
const R0 = 40;
const R1 = 26;
const radiusAt = (z: number) => R0 - ((R0 - R1) * (z - 8)) / 116;

function rot(deg: number): Mat {
  const a = (deg * Math.PI) / 180;
  return [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
}

const SAIL_ANGLES = [-90, 0, 90, 180];
const BULBS = [28, 42, 56, 69];

function towerWindow(z0: number, h: number, deg: number) {
  const zc = z0 + h / 2;
  const r = radiusAt(zc);
  const a = (deg * Math.PI) / 180;
  const x = r * Math.sin(a);
  const y = (r / 2) * Math.cos(a) - zc;
  const w = 11 * Math.cos(a);
  return { k: 'arch' as const, x: x - w / 2, y: y - h / 2, w, h };
}

const W1 = towerWindow(36, 17, 22);
const W2 = towerWindow(78, 16, 22);

const sailMat = (i: number): Mat => mul(HUB, rot(SAIL_ANGLES[i]));
const sailRing = (i: number): Pt[] => {
  const m = sailMat(i);
  return outset(
    [
      [16, -4],
      [76, -4],
      [76, 18],
      [16, 18],
    ].map(([x, y]) => apply(m, x, y)),
    3,
  );
};

const elems: ElemSpec[] = [
  { s: W1 },
  { s: W2 },
  ...SAIL_ANGLES.map((_, i) => ({
    s: { k: 'rect', x: 22, y: 9, w: 52, h: 8, r: 4, m: sailMat(i) } as const,
    dots: { k: 'line', p: sailRing(i), closed: true } as const,
  })),
];

function sail(k: Kit, i: number): ReactNode {
  const lit = k.lit(i + 2);
  const bars = [18, 32, 46, 60, 72];
  return (
    <g key={i} transform={`rotate(${SAIL_ANGLES[i]})`}>
      <rect x={16} y={1.5} width={58} height={12} fill={INK.awningA} opacity={0.82} />
      <path d={bars.map((x) => `M${x},1.5 L${x},14`).join(' ') + ' M16,7.5 L74,7.5 M16,14 L74,14'} stroke={TONES.wood.top} strokeWidth={1.3} />
      <rect x={4} y={-1.8} width={72} height={3.6} rx={1.4} fill={TONES.darkWood.left} stroke={TONES.darkWood.edge} strokeWidth={0.6} />
      {BULBS.map((x) => (
        <g key={x}>
          {lit ? <circle cx={x} cy={13} r={7} fill={k.url('halo')} /> : null}
          <circle cx={x} cy={13} r={2.7} {...bulbFill(k, lit)} />
        </g>
      ))}
    </g>
  );
}

function draw(k: Kit) {
  const sails = (
    <g>
      {[0, 1, 2, 3].map((i) => sail(k, i))}
      <circle r={6.5} fill={TONES.darkWood.top} stroke={TONES.darkWood.edge} strokeWidth={1} />
      <circle r={2.4} fill={INK.frameLight} />
    </g>
  );
  let rotor: ReactNode = sails;
  if (k.done && k.animate) rotor = <g className={k.cls('spin')}>{sails}</g>;
  else if (k.done) rotor = <g transform="rotate(24)">{sails}</g>;
  return (
    <g>
      <defs>
        {roundGrad(k.id('tower'), TONES.sand)}
        {roundGrad(k.id('cap'), TONES.roofRed)}
        {roundGrad(k.id('base'), TONES.base)}
      </defs>
      <path d={cylD(0, 0, 46, 0, 8)} fill={k.url('base')} stroke={TONES.base.edge} strokeWidth={0.8} strokeOpacity={0.6} />
      <path d={coneD(0, 0, R0, R1, 8, 124)} fill={k.url('tower')} stroke={TONES.sand.edge} strokeWidth={1} strokeOpacity={0.7} />
      <g fill="none" stroke={TONES.sand.edge} strokeWidth={0.9} opacity={0.3}>
        {[30, 52, 74, 96, 116].map((z) => {
          const r = radiusAt(z);
          return <path key={z} d={`M${n(-r)},${n(-z)} A${n(r)},${n(r / 2)} 0 0 0 ${n(r)},${n(-z)}`} />;
        })}
      </g>
      <path d={archD(-1, -18, 14, 34)} fill={TONES.wood.left} />
      <path d={archD(1, -16, 10, 32)} fill={INK.door} />
      <path d="M6,-8 L6,16" stroke={INK.doorDark} strokeWidth={0.9} />
      <path d={`M${n(W1.x - 1.5)},${n(W1.y + W1.h + 1.5)} h${n(W1.w + 3)}`} stroke={TONES.wood.top} strokeWidth={2.2} />
      <path d={`M${n(W2.x - 1.5)},${n(W2.y + W2.h + 1.5)} h${n(W2.w + 3)}`} stroke={TONES.wood.top} strokeWidth={2.2} />
      {glow(k, 0, W1, 1.8)}
      {glow(k, 1, W2, 1.8)}
      {pane(k, 0, W1)}
      {pane(k, 1, W2)}
      <path d={`M${n(W1.x + W1.w / 2)},${n(W1.y + 3)} V${n(W1.y + W1.h)} M${n(W2.x + W2.w / 2)},${n(W2.y + 3)} V${n(W2.y + W2.h)}`} stroke={INK.frame} strokeWidth={1} opacity={0.5} />
      <ellipse cx={-30} cy={20} rx={6} ry={4.5} fill={TONES.sand.left} stroke={TONES.sand.edge} strokeWidth={0.6} />
      <ellipse cx={-37} cy={17} rx={5} ry={4} fill={TONES.sand.top} stroke={TONES.sand.edge} strokeWidth={0.6} />
      <path d={cylD(0, 0, 29, 122, 127)} fill={TONES.darkWood.left} />
      <path d="M-30,-126 A30,28 0 0 1 30,-126 A30,15 0 0 1 -30,-126Z" fill={k.url('cap')} stroke={TONES.roofRed.edge} strokeWidth={1} strokeOpacity={0.7} />
      <path d="M-30,-126 A30,15 0 0 0 30,-126" fill="none" stroke={TONES.roofRed.edge} strokeWidth={1} opacity={0.5} />
      <path d="M0,-154 L0,-163" stroke={TONES.metal.edge} strokeWidth={1.3} />
      <circle cx={0} cy={-164} r={2} fill={INK.flagB} />
      <path d={`M-10,-124 L-22,-118`} stroke={TONES.darkWood.left} strokeWidth={4} strokeLinecap="round" />
      <g transform={mat(HUB)}>
        {rotor}
        {k.done && !k.animate ? (
          <g fill="none" stroke={k.L.light} strokeWidth={1.4} strokeLinecap="round" opacity={0.75}>
            <path d="M58,-40 A70,70 0 0 1 72,-6" />
            <path d="M-58,40 A70,70 0 0 1 -72,6" />
            <path d="M68,-14 L72,-6 L64,-4" />
            <path d="M-68,14 L-72,6 L-64,4" />
          </g>
        ) : null}
      </g>
    </g>
  );
}

function css(u: string): string {
  return `
.${u}-spin{transform-box:view-box;transform-origin:0 0;animation:${u}-spin 16s linear infinite}
@keyframes ${u}-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
`;
}

export const windmill: BuildingModule = {
  elems,
  draw,
  css,
  spill: { cx: 0, cy: 22, rx: 92, ry: 24 },
  burst: [-10, -100],
  top: -196,
};
