import type { ReactNode } from 'react';
import type { BuildingModule, ElemSpec, Kit } from './kit';
import { TONES, INK } from './materials';
import { LF, RF, P, mat, n, pts, line } from './iso';
import { box, edge, glow, hip, pane, archD } from './parts';
import { ACCENT } from '../palette';

/** 邮局 Post Office: mailbox lamp, door lamp, four windows; a paper plane circles it. */

const F = LF(22);
const WALL = 84;
const LAMP = P(40, 10, 37);
const ORBIT = { cx: 0, cy: -56, rx: 96, ry: 32 };

const elems: ElemSpec[] = [
  { s: { k: 'rect', x: LAMP[0] - 3.5, y: LAMP[1], w: 7, h: 9, r: 2 } },
  { s: { k: 'rect', x: -3.5, y: -55, w: 7, h: 8.5, r: 1.6, m: F } },
  { s: { k: 'arch', x: -25, y: -42, w: 12, h: 24, m: F } },
  { s: { k: 'arch', x: 13, y: -42, w: 12, h: 24, m: F } },
  { s: { k: 'rect', x: -25, y: -76, w: 12, h: 18, r: 1, m: F } },
  { s: { k: 'rect', x: 13, y: -76, w: 12, h: 18, r: 1, m: F } },
];

const PAPER = '#F4EEDC';
const PAPER_SHADE = '#BDB4D6';

function plane(k: Kit, facing: 1 | -1): ReactNode {
  return (
    <g transform={`scale(${facing === 1 ? -1.35 : 1.35} 1.35)`}>
      <circle cx={15} cy={1} r={1.6} fill={k.L.light} opacity={0.8} />
      <circle cx={20} cy={2} r={1.2} fill={k.L.light} opacity={0.55} />
      <circle cx={24.5} cy={3} r={0.9} fill={k.L.light} opacity={0.35} />
      <path d="M-11,0 L10,-6 L3,2Z" fill={PAPER} stroke={PAPER_SHADE} strokeWidth={0.6} strokeLinejoin="round" />
      <path d="M-11,0 L3,2 L6,7Z" fill={PAPER_SHADE} />
    </g>
  );
}

/** One orbit layer: front (lower half of the ellipse) or back. */
function orbitLayer(k: Kit, front: boolean): ReactNode {
  const { cx, cy, rx, ry } = ORBIT;
  const sy = ry / rx;
  return (
    <g className={k.cls(front ? 'ofront' : 'oback')}>
      <g transform={`translate(${cx} ${cy}) scale(1 ${n(sy)})`}>
        <g className={k.cls('orbit')}>
          <g transform={`translate(${rx} 0)`}>
            <g className={k.cls('orbinv')}>
              <g transform={`scale(1 ${n(1 / sy)})`}>{plane(k, front ? -1 : 1)}</g>
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}

function staticPlane(k: Kit, layer: 'back' | 'front'): ReactNode {
  const { cx, cy, rx, ry } = ORBIT;
  const arc = (a0: number, a1: number) => {
    const p: [number, number][] = [];
    for (let i = 0; i <= 16; i += 1) {
      const a = ((a0 + ((a1 - a0) * i) / 16) * Math.PI) / 180;
      p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return line(p);
  };
  if (layer === 'back') {
    return <path d={arc(200, 340)} fill="none" stroke={k.L.light} strokeWidth={1.4} strokeDasharray="2 5" strokeLinecap="round" opacity={0.5} />;
  }
  const a = (150 * Math.PI) / 180;
  return (
    <g>
      <path d={arc(-10, 140)} fill="none" stroke={k.L.light} strokeWidth={1.6} strokeDasharray="2 5" strokeLinecap="round" opacity={0.85} />
      <g transform={`translate(${n(cx + rx * Math.cos(a))} ${n(cy + ry * Math.sin(a))}) rotate(-12)`}>{plane(k, -1)}</g>
    </g>
  );
}

function mailbox(k: Kit): ReactNode {
  const top = P(40, 10, 21);
  return (
    <g>
      {box(37, 6, 43, 14, 0, 21, TONES.roofRed)}
      <ellipse cx={n(top[0])} cy={n(top[1])} rx={7.2} ry={3.6} fill={TONES.roofRed.top} stroke={TONES.roofRed.edge} strokeWidth={0.8} strokeOpacity={0.7} />
      <g transform={mat(LF(14))}>
        <rect x={38.5} y={-16} width={3} height={1.4} fill={INK.doorDark} />
      </g>
      <path d={`M${n(top[0])},${n(top[1])} L${n(LAMP[0])},${n(LAMP[1] + 9)}`} stroke={INK.frame} strokeWidth={1.4} />
      {glow(k, 0, elems[0].s, 2.4)}
      <path d={`M${n(LAMP[0] - 4.5)},${n(LAMP[1])} L${n(LAMP[0])},${n(LAMP[1] - 3.5)} L${n(LAMP[0] + 4.5)},${n(LAMP[1])}Z`} fill={INK.frame} />
      {pane(k, 0, elems[0].s)}
    </g>
  );
}

function draw(k: Kit) {
  const R = RF(30);
  return (
    <g>
      {k.done ? (k.animate ? orbitLayer(k, false) : staticPlane(k, 'back')) : null}
      {box(-33, -25, 33, 25, 0, 5, TONES.base)}
      {box(-30, -22, 30, 22, 5, WALL, TONES.sage, undefined, { top: false })}
      {box(-31.5, -23.5, 31.5, 23.5, WALL - 4, WALL + 2, TONES.cream)}
      {hip(-31.5, -23.5, 31.5, 23.5, WALL + 2, 116, TONES.roofTeal, 2.5, 3)}
      <g transform={mat(F)}>
        <rect x={-30} y={-51} width={60} height={3} fill={TONES.cream.left} />
        <rect x={-9} y={-42} width={18} height={37} rx={1} fill={TONES.cream.left} />
        <path d={archD(-7, -40, 14, 35)} fill={ACCENT.tealDeep} />
        <path d="M0,-33 L0,-5" stroke={INK.frame} strokeWidth={1} />
        <circle cx={-2} cy={-20} r={1} fill={INK.frameLight} />
        <circle cx={2} cy={-20} r={1} fill={INK.frameLight} />
        <path d="M-6,-58 L6,-58 L4,-55.5 L-4,-55.5Z" fill={TONES.cream.top} />
        <rect x={-27} y={-44} width={16} height={28} rx={1} fill={TONES.cream.left} />
        <rect x={11} y={-44} width={16} height={28} rx={1} fill={TONES.cream.left} />
        <rect x={-27} y={-78} width={16} height={22} rx={1} fill={TONES.cream.left} />
        <rect x={11} y={-78} width={16} height={22} rx={1} fill={TONES.cream.left} />
      </g>
      <g transform={mat(R)} fill={TONES.cream.right}>
        <rect x={-22} y={-51} width={44} height={3} />
        <rect x={-1.5} y={-WALL + 4} width={3} height={WALL - 9} />
        <rect x={-22} y={-WALL + 4} width={3} height={WALL - 9} />
        <circle cx={-10.5} cy={-66} r={6.5} fill={ACCENT.tealDeep} stroke={TONES.cream.top} strokeWidth={1.2} />
        <path d="M-14,-68.5 L-7,-68.5 L-7,-63.5 L-14,-63.5Z M-14,-68.5 L-10.5,-65.5 L-7,-68.5" fill="none" stroke={PAPER} strokeWidth={0.9} strokeLinejoin="round" />
        <circle cx={10.5} cy={-66} r={6.5} fill={ACCENT.tealDeep} stroke={TONES.cream.top} strokeWidth={1.2} />
        <path d="M6.5,-64 L14.5,-68 L11.5,-63.5Z" fill={PAPER} />
      </g>
      {box(-10, 22, 10, 28, 0, 4, TONES.stone)}
      {glow(k, 1, elems[1].s, 2.2)}
      {glow(k, 2, elems[2].s)}
      {glow(k, 3, elems[3].s)}
      {glow(k, 4, elems[4].s)}
      {glow(k, 5, elems[5].s)}
      {pane(k, 1, elems[1].s)}
      {pane(k, 2, elems[2].s)}
      {pane(k, 3, elems[3].s)}
      {pane(k, 4, elems[4].s)}
      {pane(k, 5, elems[5].s)}
      <g transform={mat(F)} stroke={INK.frame} strokeWidth={1} opacity={0.55}>
        <path d="M-19,-36 L-19,-18 M19,-36 L19,-18 M-25,-30 L-13,-30 M13,-30 L25,-30 M-19,-76 L-19,-58 M19,-76 L19,-58" />
      </g>
      <g transform={mat(F)} fill={TONES.cream.top}>
        <rect x={-28} y={-18} width={18} height={2.4} />
        <rect x={10} y={-18} width={18} height={2.4} />
        <rect x={-28} y={-58} width={18} height={2.4} />
        <rect x={10} y={-58} width={18} height={2.4} />
      </g>
      {box(30, -19, 36, -13, 5, 12, TONES.sand)}
      {box(30.5, -18, 34.5, -14, 12, 16, TONES.sand)}
      <path d={line([P(36, -16, 5), P(36, -16, 12), P(30, -16, 12)])} fill="none" stroke={INK.rope} strokeWidth={0.8} />
      {pediment()}
      <path d={line([P(8, 0, 115), P(8, 0, 158)])} stroke={TONES.metal.edge} strokeWidth={1.6} strokeLinecap="round" />
      <path d="M8,-154 L30,-149 L24,-145 L30,-141 L8,-137Z" fill={ACCENT.teal} stroke={ACCENT.tealPale} strokeWidth={0.6} />
      <path d="M8,-148 L22,-145.5 L8,-143Z" fill={INK.flagB} />
      {mailbox(k)}
      {k.done ? (k.animate ? orbitLayer(k, true) : staticPlane(k, 'front')) : null}
    </g>
  );
}

function pediment(): ReactNode {
  const yF = 26;
  const z0 = WALL + 2;
  const tri = [P(-16, yF, z0), P(16, yF, z0), P(0, yF, z0 + 19)];
  const slope = [P(0, yF, z0 + 19), P(16, yF, z0), P(0, 9.6, z0 + 19)];
  return (
    <g>
      <polygon points={pts(slope)} fill={TONES.roofTeal.right} />
      <path d={line(slope, true)} {...edge(TONES.roofTeal, 1, 0.6)} />
      <polygon points={pts(tri)} fill={TONES.cream.left} />
      <path d={line(tri, true)} {...edge(TONES.cream)} />
      <g transform={`${mat(LF(yF))} translate(0 ${-z0 - 6.5})`}>
        <circle r={5.6} fill={ACCENT.tealDeep} stroke={TONES.cream.top} strokeWidth={1} />
        <path d="M-3.4,-2.3 L3.4,-2.3 L3.4,2.3 L-3.4,2.3Z M-3.4,-2.3 L0,0.5 L3.4,-2.3" fill="none" stroke={PAPER} strokeWidth={0.9} strokeLinejoin="round" />
      </g>
    </g>
  );
}

function css(u: string): string {
  return `
.${u}-orbit{transform-box:view-box;transform-origin:0 0;animation:${u}-orbit 9s linear infinite}
.${u}-orbinv{transform-box:view-box;transform-origin:0 0;animation:${u}-orbinv 9s linear infinite}
@keyframes ${u}-orbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes ${u}-orbinv{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
.${u}-ofront{animation:${u}-ofront 9s linear infinite}
.${u}-oback{animation:${u}-oback 9s linear infinite}
@keyframes ${u}-ofront{0%,46%{opacity:1}50%,96%{opacity:0}100%{opacity:1}}
@keyframes ${u}-oback{0%,46%{opacity:0}50%,96%{opacity:1}100%{opacity:0}}
`;
}

export const postOffice: BuildingModule = {
  elems,
  draw,
  css,
  spill: { cx: 0, cy: 22, rx: 100, ry: 24 },
  burst: [0, -62],
  top: -156,
};
