import type { BuildingModule, ElemSpec, Kit } from './kit';
import { TONES, INK } from './materials';
import { LF, RF, P, mat, n, starPath, line } from './iso';
import { box, edge, gableX, glow, pane, haloAt, archD } from './parts';
import { ACCENT, UNLIT } from '../palette';

/** 小灯屋 Lamp Cottage: two shuttered windows (2 panes each), gable attic window, door lamp. */

const F = LF(22);
const S = RF(30);
const WALL = 78;
const RIDGE = 122;

const elems: ElemSpec[] = [
  { s: { k: 'rect', x: -22.5, y: -52.5, w: 7, h: 24, m: F } },
  { s: { k: 'rect', x: -14.5, y: -52.5, w: 7, h: 24, m: F } },
  { s: { k: 'rect', x: 7.5, y: -52.5, w: 7, h: 24, m: F } },
  { s: { k: 'rect', x: 15.5, y: -52.5, w: 7, h: 24, m: F } },
  { s: { k: 'ell', cx: 0, cy: -96, rx: 8.5, ry: 8.5, m: S } },
  { s: { k: 'rect', x: -14.5, y: -47, w: 7, h: 9, r: 1.5, m: S } },
];

const CHIMNEY_TOP = P(-17, -9.5, 142);

function windowFrame(x: number) {
  return (
    <g>
      <rect x={x - 4.5} y={-54} width={3.6} height={28} fill={ACCENT.tealDeep} stroke={ACCENT.teal} strokeWidth={0.6} />
      <rect x={x + 18.9} y={-54} width={3.6} height={28} fill={ACCENT.tealDeep} stroke={ACCENT.teal} strokeWidth={0.6} />
      <path d={`M${x - 3.6},-46 L${x - 1.8},-46 M${x - 3.6},-34 L${x - 1.8},-34 M${x + 19.8},-46 L${x + 21.6},-46 M${x + 19.8},-34 L${x + 21.6},-34`} stroke={ACCENT.teal} strokeWidth={0.8} />
      <rect x={x} y={-54} width={18} height={27} rx={1} fill={INK.frameLight} />
      <rect x={x - 1.5} y={-27} width={21} height={2.6} fill={TONES.wood.top} />
    </g>
  );
}

function flowerBox(x0: number) {
  const leaves = [0, 1, 2, 3, 4];
  return (
    <g>
      {box(x0, 22, x0 + 20, 26, 19, 23.5, TONES.wood)}
      {leaves.map((i) => {
        const p = P(x0 + 2 + i * 4, 24, 25 + (i % 2) * 1.5);
        return (
          <g key={i}>
            <circle cx={n(p[0])} cy={n(p[1])} r={3.1} fill={i % 2 ? INK.leafDark : INK.leaf} />
            {i % 2 === 0 ? <circle cx={n(p[0] + 0.6)} cy={n(p[1] - 2)} r={1.4} fill={INK.flagA} /> : null}
          </g>
        );
      })}
    </g>
  );
}

function stars(k: Kit) {
  const [cx, cy] = CHIMNEY_TOP;
  if (k.animate) {
    return (
      <g transform={`translate(${n(cx)} ${n(cy - 4)})`}>
        {[0, 1, 2, 3].map((i) => (
          <g key={i} className={k.cls(i % 2 ? 'riseB' : 'riseA')} style={{ animationDelay: `${-i * 1.25}s` }}>
            <circle r={9} fill={k.url('halo')} />
            <path d={starPath(i % 2 ? 5.5 : 6.8)} fill={k.L.light} stroke={k.L.glow} strokeWidth={0.8} strokeLinejoin="round" />
            <circle r={1.7} fill={k.L.core} />
          </g>
        ))}
      </g>
    );
  }
  const still: [number, number, number, number][] = [
    [3, -18, 6.8, 1],
    [-12, -42, 5.8, 0.9],
    [6, -64, 4.8, 0.75],
    [-6, -86, 3.9, 0.55],
  ];
  return (
    <g>
      {still.map(([dx, dy, r, o], i) => (
        <g key={i} transform={`translate(${n(cx + dx)} ${n(cy + dy)})`} opacity={o}>
          <circle r={r * 1.5} fill={k.url('halo')} />
          <path d={starPath(r)} fill={k.L.light} stroke={k.L.glow} strokeWidth={0.8} strokeLinejoin="round" />
          <circle r={r * 0.28} fill={k.L.core} />
        </g>
      ))}
    </g>
  );
}

function draw(k: Kit) {
  const [cx, cy] = CHIMNEY_TOP;
  return (
    <g>
      {box(-33, -25, 33, 25, 0, 5, TONES.base)}
      {box(30, -10, 37, 8, 0, 3.5, TONES.stone)}
      {box(-30, -22, 30, 22, 5, WALL, TONES.plaster, undefined, { top: false })}
      <g transform={mat(F)}>
        <rect x={26.5} y={-WALL} width={3.5} height={WALL - 5} fill={TONES.wood.left} />
        <rect x={-30} y={-WALL} width={3.5} height={WALL - 5} fill={TONES.wood.left} />
        <rect x={-30} y={-WALL} width={60} height={4} fill={TONES.wood.left} />
        {windowFrame(-24)}
        {windowFrame(6)}
      </g>
      <g transform={mat(S)}>
        <rect x={-22} y={-WALL} width={3.5} height={WALL - 5} fill={TONES.wood.right} />
        <rect x={18.5} y={-WALL} width={3.5} height={WALL - 5} fill={TONES.wood.right} />
        <rect x={-22} y={-WALL} width={44} height={4} fill={TONES.wood.right} />
        <path d={archD(-3, -43, 15, 38)} fill={INK.frameLight} />
        <path d={archD(-1.5, -41.5, 12, 36.5)} fill={INK.door} />
        <path d="M4.5,-35 L4.5,-5 M1,-32 L1,-5 M8,-32 L8,-5" stroke={INK.doorDark} strokeWidth={1} />
        <circle cx={8} cy={-21} r={1.1} fill={INK.frameLight} />
        <path d="M-11,-51 L-11,-48 M-11,-51 L-16,-51" stroke={INK.frame} strokeWidth={1.3} strokeLinecap="round" />
      </g>
      {glow(k, 0, elems[0].s)}
      {glow(k, 1, elems[1].s)}
      {glow(k, 2, elems[2].s)}
      {glow(k, 3, elems[3].s)}
      {pane(k, 0, elems[0].s)}
      {pane(k, 1, elems[1].s)}
      {pane(k, 2, elems[2].s)}
      {pane(k, 3, elems[3].s)}
      <g transform={mat(F)} stroke={INK.frame} strokeWidth={1} opacity={0.55}>
        <path d="M-22.5,-40.5 L-8,-40.5 M7.5,-40.5 L22.5,-40.5" />
      </g>
      {flowerBox(-25)}
      {flowerBox(5)}
      {glow(k, 5, elems[5].s, 2.2)}
      <g transform={mat(S)}>
        <path d="M-15.5,-47 L-11,-50.5 L-6.5,-47Z" fill={INK.frame} />
      </g>
      {pane(k, 5, elems[5].s)}
      <g transform={mat(S)}>
        <rect x={-12.5} y={-38} width={3} height={1.6} fill={INK.frame} />
      </g>
      {box(31, -21, 37, -15, 5, 11, TONES.roofRed)}
      <circle cx={n(P(34, -18, 14)[0])} cy={n(P(34, -18, 14)[1])} r={4.4} fill={INK.leaf} />
      <circle cx={n(P(34, -18, 14)[0] + 2.5)} cy={n(P(34, -18, 14)[1] - 2.5)} r={2.6} fill={INK.leafDark} />
      {box(-22, -14, -12, -5, 90, 138, TONES.brick)}
      {box(-23.5, -15.5, -10.5, -3.5, 137, 142, TONES.stone)}
      {k.done ? haloAt(k, true, cx, cy - 6, 22, 16) : null}
      {k.done ? <ellipse cx={n(cx)} cy={n(cy)} rx={5} ry={2.4} fill={k.L.light} opacity={0.9} /> : null}
      {gableX(-30, -22, 30, 22, WALL, RIDGE, TONES.roofRed, TONES.plaster, 5, 4)}
      <g transform={mat(S)}>
        <rect x={-22} y={-WALL - 1} width={44} height={3.5} fill={TONES.wood.right} />
      </g>
      {glow(k, 4, elems[4].s, 2)}
      <g transform={mat(S)}>
        <circle cx={0} cy={-96} r={11} fill={INK.frameLight} />
      </g>
      {pane(k, 4, elems[4].s)}
      <g transform={mat(S)}>
        <path d="M0,-104.5 L0,-87.5 M-8.5,-96 L8.5,-96" stroke={k.lit(4) ? INK.frame : UNLIT.windowFrame} strokeWidth={1.2} opacity={0.75} />
      </g>
      <path d={line([P(-35, 0, RIDGE), P(35, 0, RIDGE)])} {...edge(TONES.roofRed, 1.6, 0.9)} />
      {k.done ? stars(k) : null}
    </g>
  );
}

function css(u: string): string {
  return `
.${u}-riseA,.${u}-riseB{transform-box:view-box;transform-origin:0 0;animation:${u}-riseA 5s ease-in-out infinite}
.${u}-riseB{animation-name:${u}-riseB}
@keyframes ${u}-riseA{0%{transform:translate(0,0) scale(.35);opacity:0}15%{opacity:1}50%{transform:translate(-14px,-50px) scale(.9)}80%{opacity:.85}100%{transform:translate(4px,-100px) scale(1.05);opacity:0}}
@keyframes ${u}-riseB{0%{transform:translate(0,0) scale(.35);opacity:0}15%{opacity:1}50%{transform:translate(12px,-46px) scale(.85)}80%{opacity:.85}100%{transform:translate(-6px,-94px) scale(1);opacity:0}}
`;
}

export const cottage: BuildingModule = {
  elems,
  draw,
  css,
  spill: { cx: 0, cy: 22, rx: 96, ry: 24 },
  burst: [0, -66],
  top: -156,
};
