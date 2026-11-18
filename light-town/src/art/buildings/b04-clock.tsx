import type { ReactNode } from 'react';
import type { BuildingModule, ElemSpec, Kit } from './kit';
import { TONES, INK } from './materials';
import { LF, RF, P, mat, n } from './iso';
import { box, glow, pane, pyramid, archD, vine } from './parts';
import { ACCENT, UNLIT } from '../palette';

/** 钟楼 Clock Tower: door glass, two floor windows, pendulum window, clock face, belfry; spire lantern on top. */

const F = LF(20);
const R = RF(20);
const C = LF(22.5);
const PIVOT = -131;
const CLOCK = { cx: 0, cy: -157, r: 13 };
const LANTERN = P(0, 0, 250);

const elems: ElemSpec[] = [
  { s: { k: 'arch', x: -6, y: -44, w: 12, h: 16, m: F } },
  { s: { k: 'arch', x: -6, y: -88, w: 12, h: 22, m: F } },
  { s: { k: 'arch', x: -8, y: -133, w: 16, h: 36, m: F } },
  { s: { k: 'ell', cx: CLOCK.cx, cy: CLOCK.cy, rx: CLOCK.r, ry: CLOCK.r, m: C } },
  { s: { k: 'arch', x: -8, y: -203, w: 16, h: 22, m: LF(19) } },
  { s: { k: 'rect', x: LANTERN[0] - 4.5, y: LANTERN[1] - 5, w: 9, h: 11, r: 2 } },
];

/** Alternating corner stones up both edges of a face, as one path. */
function quoins(): string {
  let d = '';
  for (let z = 14; z < 136; z += 12) {
    const w = (z / 12) % 2 < 1 ? 5 : 3;
    d += `M${20 - w},${-z - 6}h${w}v6h${-w}Z M-20,${-z - 6}h${8 - w}v6h${w - 8}Z`;
  }
  return d;
}

function pendulum(k: Kit): ReactNode {
  const lit = k.lit(2);
  const color = lit ? INK.frame : '#7C8BC4';
  const body = (
    <g>
      <path d="M0,0 L0,24" stroke={color} strokeWidth={1.4} />
      <circle cx={0} cy={27} r={4.6} fill={lit ? INK.frame : '#7C8BC4'} stroke={lit ? k.L.glow : UNLIT.windowFrame} strokeWidth={0.8} />
      <circle cx={-1.3} cy={25.6} r={1.3} fill={lit ? k.L.core : '#A9B6E6'} opacity={0.8} />
    </g>
  );
  let inner: ReactNode = body;
  if (k.done && k.animate) inner = <g className={k.cls('pend')}>{body}</g>;
  else if (k.done) inner = <g transform="rotate(14)">{body}</g>;
  return (
    <g transform={mat(F)}>
      <g transform={`translate(0 ${PIVOT})`}>
        {inner}
        {k.done && !k.animate ? (
          <g fill="none" stroke={k.L.light} strokeWidth={1.1} strokeLinecap="round">
            <path d="M-9.5,26 Q-11,31 -8.5,35" opacity={0.8} />
            <path d="M-13,24 Q-15,31 -11.5,37" opacity={0.5} />
          </g>
        ) : null}
        <circle r={1.6} fill={INK.frame} />
      </g>
    </g>
  );
}

function clockFace(k: Kit): ReactNode {
  const lit = k.lit(3);
  const ticks: ReactNode[] = [];
  for (let i = 0; i < 12; i += 1) {
    const a = (i * Math.PI) / 6;
    const r0 = i % 3 === 0 ? 8.6 : 10;
    ticks.push(
      <path
        key={i}
        d={`M${n(Math.sin(a) * r0)},${n(-Math.cos(a) * r0)} L${n(Math.sin(a) * 11.4)},${n(-Math.cos(a) * 11.4)}`}
        stroke={lit ? INK.frame : UNLIT.windowFrame}
        strokeWidth={i % 3 === 0 ? 1.6 : 1}
        strokeLinecap="round"
      />,
    );
  }
  return (
    <g transform={mat(C)}>
      <g transform={`translate(${CLOCK.cx} ${CLOCK.cy})`}>
        {ticks}
        <path d="M0,0 L-5.2,-3.4 M0,0 L5.6,-6.6" stroke={lit ? INK.doorDark : '#8796CF'} strokeWidth={1.8} strokeLinecap="round" />
        <circle r={1.6} fill={lit ? INK.doorDark : '#8796CF'} />
      </g>
    </g>
  );
}

function draw(k: Kit) {
  const stone = TONES.stone;
  return (
    <g>
      {box(-27, -27, 27, 27, 0, 6, TONES.base)}
      {box(-24, -24, 24, 24, 6, 10, TONES.base)}
      {box(-20, -20, 20, 20, 10, 140, stone, undefined, { top: false })}
      <path d={quoins()} transform={mat(F)} fill={stone.top} opacity={0.55} />
      <path d={quoins()} transform={mat(R)} fill={stone.left} opacity={0.5} />
      {[52, 96].map((z) => (
        <g key={z}>{box(-21.5, -21.5, 21.5, 21.5, z - 3, z + 1, TONES.cream)}</g>
      ))}
      <g transform={mat(F)}>
        <path d={archD(-9, -47, 18, 37)} fill={TONES.cream.left} />
        <path d={archD(-7.5, -45.5, 15, 35.5)} fill={INK.door} />
        <path d={archD(-8, -90, 16, 26)} fill={TONES.cream.left} />
        <path d={archD(-10, -135, 20, 40)} fill={TONES.cream.left} />
        <rect x={-9} y={-67} width={18} height={2.4} fill={TONES.cream.top} />
        <rect x={-11} y={-97} width={22} height={2.4} fill={TONES.cream.top} />
      </g>
      <g transform={mat(R)}>
        {vine(
          [
            [6, -10],
            [2, -30],
            [8, -48],
            [3, -70],
            [9, -88],
            [4, -108],
            [10, -126],
          ],
          8,
        )}
      </g>
      {glow(k, 0, elems[0].s, 2)}
      {glow(k, 1, elems[1].s)}
      {glow(k, 2, elems[2].s, 1.5)}
      {pane(k, 0, elems[0].s)}
      <g transform={mat(F)}>
        <path d="M-6,-28 L6,-28" stroke={INK.frame} strokeWidth={1.2} opacity={0.6} />
      </g>
      {pane(k, 1, elems[1].s)}
      <g transform={mat(F)}>
        <path d="M0,-82 L0,-66 M-6,-74 L6,-74" stroke={INK.frame} strokeWidth={1.1} opacity={0.55} />
      </g>
      {pane(k, 2, elems[2].s)}
      {pendulum(k)}
      {box(-22.5, -22.5, 22.5, 22.5, 138, 176, TONES.cream)}
      <g transform={mat(R)}>
        <circle cx={0} cy={-157} r={10} fill={TONES.cream.right} stroke={TONES.stone.right} strokeWidth={1.4} />
        <path d="M0,-163 L1.8,-158.8 L6,-157 L1.8,-155.2 L0,-151 L-1.8,-155.2 L-6,-157 L-1.8,-158.8Z" fill={ACCENT.tealDeep} />
      </g>
      <g transform={mat(C)}>
        <circle cx={0} cy={-157} r={16.5} fill={TONES.stone.left} stroke={TONES.cream.top} strokeWidth={1.2} />
      </g>
      {glow(k, 3, elems[3].s, 1.5)}
      {pane(k, 3, elems[3].s)}
      {clockFace(k)}
      {box(-19, -19, 19, 19, 176, 206, stone)}
      <g transform={mat(LF(19))}>
        <path d={archD(-10, -205, 20, 26)} fill={TONES.cream.left} />
      </g>
      <g transform={mat(RF(19))}>
        <path d={archD(-8, -203, 16, 22)} fill={UNLIT.windowFill} stroke={stone.edge} strokeWidth={1} />
        <path d="M-8,-188 L8,-188" stroke={stone.edge} strokeWidth={1.2} />
      </g>
      {glow(k, 4, elems[4].s, 1.6)}
      {pane(k, 4, elems[4].s)}
      <g transform={mat(LF(19))}>
        <path d="M-4.5,-186 Q-4.5,-196 0,-196 Q4.5,-196 4.5,-186 L6,-184 L-6,-184Z" fill={k.lit(4) ? INK.frame : '#6F7FBA'} />
        <circle cx={0} cy={-183} r={1.6} fill={k.lit(4) ? INK.frame : '#6F7FBA'} />
      </g>
      {box(-21, -21, 21, 21, 205, 209, TONES.cream)}
      {pyramid(-21, -21, 21, 21, 209, 244, TONES.roofTeal, 2)}
      {glow(k, 5, elems[5].s, 2.4)}
      <path d={`M${n(LANTERN[0] - 6)},${n(LANTERN[1] - 5)} L${n(LANTERN[0])},${n(LANTERN[1] - 10)} L${n(LANTERN[0] + 6)},${n(LANTERN[1] - 5)}Z`} fill={TONES.roofTeal.top} />
      {pane(k, 5, elems[5].s)}
      <path d={`M${n(LANTERN[0])},${n(LANTERN[1] - 10)} L${n(LANTERN[0])},${n(LANTERN[1] - 18)}`} stroke={TONES.metal.edge} strokeWidth={1.4} />
      <circle cx={n(LANTERN[0])} cy={n(LANTERN[1] - 19)} r={1.8} fill={INK.flagB} />
    </g>
  );
}

function css(u: string): string {
  return `
.${u}-pend{transform-box:view-box;transform-origin:0 0;animation:${u}-pend 2.8s ease-in-out infinite}
@keyframes ${u}-pend{0%,100%{transform:rotate(-15deg)}50%{transform:rotate(15deg)}}
`;
}

export const clockTower: BuildingModule = {
  elems,
  draw,
  css,
  spill: { cx: 0, cy: 22, rx: 84, ry: 24 },
  burst: [0, -140],
  top: -272,
};
