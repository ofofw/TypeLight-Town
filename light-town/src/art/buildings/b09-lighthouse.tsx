import type { ReactNode } from 'react';
import type { BuildingModule, ElemSpec, Kit, Shape } from './kit';
import { TONES, INK } from './materials';
import { n } from './iso';
import { bulbFill, coneD, cylD, glow, pane, roundGrad, archD } from './parts';
import { UNLIT } from '../palette';

/** 灯塔 Lighthouse: sections light from the door up to the lantern; a soft beam sweeps the sea. */

const Z0 = 12;
const ZT = 186;
const RB = 30;
const RT = 19;
const radiusAt = (z: number) => RB - ((RB - RT) * (z - Z0)) / (ZT - Z0);
const BANDS: [number, number, boolean][] = [
  [Z0, 46, false],
  [46, 80, true],
  [80, 114, false],
  [114, 148, true],
  [148, ZT, false],
];
const LANTERN_Y = -205;
const GALLERY_ANGLES = [-72, -48, -24, 0, 24, 48, 72];

function win(zc: number, w: number, h: number) {
  const y = radiusAt(zc) / 2 - zc;
  return { k: 'arch' as const, x: -w / 2, y: y - h / 2, w, h };
}

const lanternShape: Shape = { k: 'path', d: cylD(0, 0, 15, 192, 218), box: [-15, -225.5, 15, -184.5] };

const elems: ElemSpec[] = [
  { s: { k: 'arch', x: -6.5, y: -24, w: 13, h: 27 } },
  { s: win(67, 9, 14) },
  { s: win(103, 9, 14) },
  { s: win(139, 9, 14) },
  { s: { k: 'ell', cx: 0, cy: -199, rx: 31, ry: 14 }, dots: { k: 'ring', cx: 0, cy: -198, rx: 40, ry: 22 } },
  { s: lanternShape },
];

function beam(k: Kit): ReactNode {
  const shape = (
    <g>
      <path d="M0,-3.5 L-340,-52 L-340,52 L0,3.5Z" fill={k.url('beam')} />
      <path d="M0,-1.8 L-250,-16 L-250,16 L0,1.8Z" fill={k.url('beam')} opacity={0.9} />
    </g>
  );
  return (
    <g transform={`translate(0 ${LANTERN_Y})`}>
      {k.animate ? <g className={k.cls('sweep')}>{shape}</g> : <g transform="rotate(-14)">{shape}</g>}
    </g>
  );
}

function draw(k: Kit) {
  const railY = (deg: number) => (27 / 2) * Math.cos((deg * Math.PI) / 180) - 199;
  return (
    <g>
      <defs>
        {roundGrad(k.id('cream'), TONES.cream)}
        {roundGrad(k.id('red'), TONES.roofRed)}
        {roundGrad(k.id('dark'), TONES.darkWood)}
        <linearGradient id={k.id('beam')} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="-330" y2="0">
          <stop offset="0" stopColor={k.L.core} stopOpacity="0.8" />
          <stop offset="0.3" stopColor={k.L.light} stopOpacity="0.4" />
          <stop offset="1" stopColor={k.L.light} stopOpacity="0" />
        </linearGradient>
      </defs>
      {k.done ? beam(k) : null}
      <path d="M-54,8 Q-54,-6 -36,-10 Q-16,-17 6,-13 Q30,-16 48,-5 Q58,6 44,16 Q14,30 -18,25 Q-48,21 -54,8Z" fill={TONES.base.left} stroke={TONES.base.edge} strokeWidth={1} strokeOpacity={0.6} />
      <path d="M-46,0 Q-40,-9 -24,-10 Q-6,-14 10,-10 Q30,-12 44,-4 Q30,2 10,2 Q-16,6 -46,0Z" fill={TONES.base.top} opacity={0.85} />
      <ellipse cx={42} cy={18} rx={11} ry={6} fill={TONES.base.right} stroke={TONES.base.edge} strokeWidth={0.8} strokeOpacity={0.5} />
      <ellipse cx={-46} cy={20} rx={9} ry={5} fill={TONES.base.right} stroke={TONES.base.edge} strokeWidth={0.8} strokeOpacity={0.5} />
      {BANDS.map(([z0, z1, red]) => (
        <path key={z0} d={coneD(0, 0, radiusAt(z0), radiusAt(z1), z0, z1)} fill={k.url(red ? 'red' : 'cream')} />
      ))}
      <path d={coneD(0, 0, RB, RT, Z0, ZT)} fill="none" stroke={TONES.cream.edge} strokeWidth={1} strokeOpacity={0.6} />
      <path d={archD(-8.5, -26, 17, 29)} fill={TONES.cream.right} />
      {[1, 2, 3].map((i) => {
        const s = elems[i].s;
        return s.k === 'arch' ? <path key={i} d={archD(s.x - 2, s.y - 2, s.w + 4, s.h + 3)} fill={TONES.darkWood.left} /> : null;
      })}
      {[0, 1, 2, 3].map((i) => glow(k, i, elems[i].s, 1.9, i))}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>{pane(k, i, elems[i].s)}</g>
      ))}
      <path d="M0,-17 L0,3" stroke={k.lit(0) ? INK.frame : UNLIT.windowFrame} strokeWidth={1} opacity={0.6} />
      <path d={cylD(0, 0, 29, 185, 191)} fill={k.url('dark')} stroke={TONES.darkWood.edge} strokeWidth={0.8} strokeOpacity={0.7} />
      {glow(k, 5, lanternShape, 1.4)}
      {pane(k, 5, lanternShape)}
      {k.lit(5) ? <ellipse cx={0} cy={-205} rx={6} ry={7} fill={k.L.core} /> : null}
      <path d="M-15,-205 A15,7.5 0 0 0 15,-205 M-7.5,-191 L-7.5,-216 M7.5,-191 L7.5,-216 M0,-185 L0,-210" fill="none" stroke={TONES.darkWood.left} strokeWidth={1.4} />
      <path d={cylD(0, 0, 15, 192, 218)} fill="none" stroke={TONES.darkWood.edge} strokeWidth={1} strokeOpacity={0.8} />
      <path d="M-18,-218 A18,16 0 0 1 18,-218 A18,9 0 0 1 -18,-218Z" fill={k.url('red')} stroke={TONES.roofRed.edge} strokeWidth={1} strokeOpacity={0.7} />
      <circle cx={0} cy={-235} r={3} fill={TONES.darkWood.top} />
      <path d="M0,-238 L0,-247" stroke={TONES.metal.edge} strokeWidth={1.3} />
      {k.done ? <ellipse cx={0} cy={LANTERN_Y} rx={34} ry={30} fill={k.url('halo')} /> : null}
      <g>
        {glow(k, 4, elems[4].s, 1.15)}
        <path d="M-27,-199 A27,13.5 0 0 0 27,-199" fill="none" stroke={TONES.darkWood.edge} strokeWidth={1.3} />
        <path d="M-27,-191 A27,13.5 0 0 0 27,-191" fill="none" stroke={TONES.darkWood.edge} strokeWidth={1} opacity={0.6} />
        {[-80, -40, 0, 40, 80].map((d) => {
          const x = 27 * Math.sin((d * Math.PI) / 180);
          const y = railY(d);
          return <path key={d} d={`M${n(x)},${n(y)} L${n(x)},${n(y + 8)}`} stroke={TONES.darkWood.edge} strokeWidth={1} />;
        })}
        {GALLERY_ANGLES.map((d) => {
          const x = 27 * Math.sin((d * Math.PI) / 180);
          const y = railY(d) - 3;
          return <circle key={d} cx={n(x)} cy={n(y)} r={2.6} {...bulbFill(k, k.lit(4))} />;
        })}
      </g>
    </g>
  );
}

function css(u: string): string {
  return `
.${u}-sweep{transform-box:view-box;transform-origin:0 0;animation:${u}-sweep 7s ease-in-out infinite alternate}
@keyframes ${u}-sweep{from{transform:rotate(-24deg)}to{transform:rotate(20deg)}}
`;
}

export const lighthouse: BuildingModule = {
  elems,
  draw,
  css,
  spill: { cx: 0, cy: 22, rx: 84, ry: 24 },
  burst: [0, -120],
  top: -250,
};
