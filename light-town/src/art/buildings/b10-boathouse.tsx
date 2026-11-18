import type { ReactNode } from 'react';
import type { BuildingModule, ElemSpec, Kit } from './kit';
import { TONES, INK } from './materials';
import { LF, RF, P, mat, n, line } from './iso';
import { box, bulbFill, gableY, glow, haloAt, pane, archD } from './parts';
import { UNLIT } from '../palette';

/** 船屋 Boathouse: three portholes, three dock lamps; a little boat bobs beside the pier. */

const F = LF(8);
const LAMPS = [-24, 2, 28].map((x) => ({ foot: P(x, 21, 9), head: P(x, 21, 34) }));
const BOAT = { x: 54, y: 12 };
const WATER = '#1E4A70';
const WATER_LIGHT = '#5FA9C9';

const elems: ElemSpec[] = [
  { s: { k: 'ell', cx: -19, cy: -40, rx: 5.6, ry: 5.6, m: F } },
  { s: { k: 'ell', cx: -3, cy: -40, rx: 5.6, ry: 5.6, m: F } },
  { s: { k: 'ell', cx: -6, cy: -83, rx: 5.6, ry: 5.6, m: F } },
  ...LAMPS.map(({ head }) => ({ s: { k: 'rect', x: head[0] - 3.2, y: head[1] - 4, w: 6.4, h: 8, r: 1.6 } as const })),
];

function porthole(k: Kit, i: number): ReactNode {
  const s = elems[i].s;
  if (s.k !== 'ell') return null;
  return (
    <g key={i}>
      <g transform={mat(F)}>
        <circle cx={s.cx} cy={s.cy} r={8.2} fill="#C29A5B" stroke="#8E6A3C" strokeWidth={0.9} />
      </g>
      {pane(k, i, s)}
      <g transform={mat(F)}>
        <path d={`M${s.cx - 4},${s.cy - 2} A4.6,4.6 0 0 1 ${s.cx + 1},${s.cy - 4.6}`} fill="none" stroke={k.lit(i) ? '#FFFFFF' : UNLIT.edge} strokeWidth={1} opacity={0.55} strokeLinecap="round" />
      </g>
    </g>
  );
}

function boat(k: Kit): ReactNode {
  const body = (
    <g>
      <path d="M-17,-4 Q-14,6 1,7 Q15,6 19,-6 Q2,-2 -17,-4Z" fill={TONES.roofRed.left} stroke={TONES.roofRed.edge} strokeWidth={0.8} />
      <path d="M-17,-4 Q2,-2 19,-6 Q4,-8 -15,-7Z" fill={TONES.darkWood.right} />
      <path d="M-15.5,-1.5 Q2,1 18,-3" fill="none" stroke={INK.awningA} strokeWidth={1.2} opacity={0.8} />
      <path d="M8,-5 L8,-26" stroke={TONES.darkWood.top} strokeWidth={1.4} />
      <path d="M8,-26 L12,-26 L12,-23" fill="none" stroke={TONES.darkWood.top} strokeWidth={1.1} />
      <circle cx={12} cy={-16} r={9} fill={k.url('halo')} />
      <rect x={9.4} y={-23} width={5.2} height={6.5} rx={1.4} {...bulbFill(k, true)} />
    </g>
  );
  const ripples = (
    <g fill="none" stroke={WATER_LIGHT} strokeLinecap="round">
      <path d="M-24,8 Q1,13 26,6" strokeWidth={1.2} opacity={0.6} />
      <path d="M-30,13 Q2,19 32,11" strokeWidth={1} opacity={0.35} />
    </g>
  );
  return (
    <g transform={`translate(${BOAT.x} ${BOAT.y})`}>
      <ellipse cx={1} cy={4} rx={26} ry={6} fill={k.url('halo')} />
      {k.animate ? (
        <g className={k.cls('ripple')}>{ripples}</g>
      ) : (
        ripples
      )}
      {k.animate ? <g className={k.cls('bob')}>{body}</g> : <g transform="rotate(-3)">{body}</g>}
      {!k.animate ? (
        <g fill="none" stroke={k.L.light} strokeWidth={1.1} strokeLinecap="round" opacity={0.7}>
          <path d="M-24,-10 Q-27,-4 -24,1" />
          <path d="M27,-14 Q30,-8 27,-3" />
        </g>
      ) : null}
    </g>
  );
}

function draw(k: Kit) {
  const posts: [number, number][] = [
    [-29, 21],
    [-2, 21],
    [33, 21],
    [33, 9],
  ];
  return (
    <g>
      <ellipse cx={16} cy={14} rx={78} ry={15} fill={WATER} opacity={0.55} />
      <path d="M-52,18 Q-36,22 -20,19 M30,24 Q46,27 62,22 M60,4 Q74,7 86,3" fill="none" stroke={WATER_LIGHT} strokeWidth={1} opacity={0.4} strokeLinecap="round" />
      {posts.map(([x, y], i) => (
        <g key={i}>{box(x - 1.6, y - 1.6, x + 1.6, y + 1.6, 0, 7, TONES.darkWood)}</g>
      ))}
      {box(-30, -24, 18, 8, 5, 9, TONES.darkWood)}
      {box(-30, 8, 34, 22, 6, 9, TONES.wood)}
      <g stroke={TONES.wood.edge} strokeWidth={0.8} opacity={0.35}>
        {[-18, -6, 6, 18, 30].map((x) => (
          <path key={x} d={line([P(x, 8, 9), P(x, 22, 9)])} />
        ))}
      </g>
      {box(-28, -22, 16, 8, 9, 66, TONES.wood, undefined, { top: false })}
      <g transform={mat(F)} stroke={TONES.wood.edge} strokeWidth={0.8} opacity={0.22}>
        {[20, 30, 40, 50, 60].map((z) => (
          <path key={z} d={`M-28,${-z} L16,${-z}`} />
        ))}
      </g>
      <g transform={mat(RF(16))}>
        <path d={archD(0, -52, 19, 43)} fill={TONES.darkWood.left} />
        <path d={archD(1.5, -50.5, 16, 41.5)} fill={TONES.darkWood.right} />
        <path d="M9.5,-50 L9.5,-9 M1.5,-12 L17.5,-36 M1.5,-36 L17.5,-12" stroke={TONES.darkWood.edge} strokeWidth={0.9} opacity={0.55} />
      </g>
      <g transform={mat(F)}>
        <circle cx={10} cy={-23} r={5.5} fill="none" stroke="#E8E2F4" strokeWidth={3} />
        <path d="M10,-28.5 A5.5,5.5 0 0 1 15.5,-23 M10,-17.5 A5.5,5.5 0 0 1 4.5,-23" fill="none" stroke={INK.flagA} strokeWidth={3} />
      </g>
      {[0, 1, 2].map((i) => glow(k, i, elems[i].s, 2, i))}
      {porthole(k, 0)}
      {porthole(k, 1)}
      {gableY(-28, -22, 16, 8, 66, 104, TONES.roofSlate, TONES.wood, 4, 4)}
      {porthole(k, 2)}
      <path d={line([P(-6, 8, 100), P(-6, 8, 111)])} stroke={TONES.metal.edge} strokeWidth={1.3} />
      <path d="M-14,-114 L-2,-111 L-14,-108Z" fill={INK.flagC} />
      {box(-8, 12, 2, 18, 9, 12, TONES.sand)}
      <ellipse cx={n(P(-3, 15, 13)[0])} cy={n(P(-3, 15, 13)[1])} rx={5} ry={2.4} fill="none" stroke={INK.rope} strokeWidth={1.4} />
      {LAMPS.map(({ foot, head }, i) => (
        <g key={i}>
          <path d={`M${n(foot[0])},${n(foot[1])} L${n(head[0])},${n(head[1] + 4)}`} stroke={TONES.darkWood.top} strokeWidth={1.8} strokeLinecap="round" />
          {haloAt(k, k.lit(i + 3), head[0], head[1], 13)}
          <path d={`M${n(head[0] - 4.2)},${n(head[1] - 4)} L${n(head[0])},${n(head[1] - 7.5)} L${n(head[0] + 4.2)},${n(head[1] - 4)}Z`} fill={INK.frame} />
          {pane(k, i + 3, elems[i + 3].s)}
        </g>
      ))}
      {box(32, 6, 36, 10, 9, 15, TONES.darkWood)}
      {k.done ? boat(k) : (
        <path d={`M${BOAT.x - 20},${BOAT.y + 8} Q${BOAT.x},${BOAT.y + 12} ${BOAT.x + 22},${BOAT.y + 6}`} fill="none" stroke={WATER_LIGHT} strokeWidth={1} opacity={0.35} />
      )}
    </g>
  );
}

function css(u: string): string {
  return `
.${u}-bob{transform-box:view-box;transform-origin:0 0;animation:${u}-bob 3.8s ease-in-out infinite}
@keyframes ${u}-bob{0%,100%{transform:translate(0,0) rotate(-3deg)}50%{transform:translate(0,-3px) rotate(3deg)}}
.${u}-ripple{animation:${u}-ripple 3.8s ease-in-out infinite}
@keyframes ${u}-ripple{0%,100%{opacity:.5}50%{opacity:1}}
`;
}

export const boathouse: BuildingModule = {
  elems,
  draw,
  css,
  spill: { cx: 0, cy: 22, rx: 96, ry: 24 },
  burst: [0, -60],
  top: -116,
};
