import type { ReactNode } from 'react';
import type { BuildingModule, ElemSpec, Kit } from './kit';
import { TONES, INK } from './materials';
import { LF, RF, mat, n, hash01, sparklePath } from './iso';
import { box, cylD, glow, pane, roundGrad, archD } from './parts';
import { ACCENT, UNLIT } from '../palette';

/** 图书馆 Library: four book-spine windows, clerestory band, entrance; a glowing open book appears. */

const F = LF(20);
const U = LF(12);
const WIN_X = [-28.5, -17.5, 10, 21];
const BOOK = { x: -20, y: -60 };

const elems: ElemSpec[] = [
  ...WIN_X.map((x) => ({ s: { k: 'rect', x, y: -56, w: 7.5, h: 38, m: F } as const })),
  { s: { k: 'rect', x: -18, y: -90, w: 36, h: 13, m: U } },
  { s: { k: 'arch', x: -7, y: -44, w: 14, h: 38, m: F } },
];

function spines(x: number, seed: number, lit: boolean): ReactNode {
  let d = '';
  for (let c = 0; c < 3; c += 1) {
    const yb = -56 + 12.5 * (c + 1) + 0.3;
    for (let j = 0; j < 3; j += 1) {
      const h = 6.5 + 4 * hash01(seed * 31 + c * 7 + j);
      const w = 1.5 + 0.6 * hash01(seed * 17 + c * 5 + j * 3);
      const bx = x + 0.7 + j * 2.25;
      d += `M${n(bx)},${n(yb)} v${n(-h)} h${n(w)} v${n(h)}Z`;
    }
  }
  const shelf = `M${x},-43.5 h7.5 M${x},-31 h7.5`;
  return (
    <g>
      <path d={d} fill={lit ? INK.frame : '#33427A'} opacity={lit ? 0.72 : 0.9} />
      <path d={shelf} stroke={lit ? INK.frame : UNLIT.windowFrame} strokeWidth={1} opacity={0.8} />
    </g>
  );
}

const PAGE_L = 'M0,0 Q-8,-5 -17,-2 L-16,7 Q-8,3.5 0,8Z';
const PAGE_R = 'M0,0 Q8,-5 17,-2 L16,7 Q8,3.5 0,8Z';

function openBook(k: Kit): ReactNode {
  const flip = k.animate ? (
    <g className={k.cls('flip')}>
      <path d={PAGE_R} fill={k.L.core} stroke={k.L.glow} strokeWidth={0.7} />
    </g>
  ) : (
    <g transform="translate(0 -2) scale(0.45 1.08)">
      <path d={PAGE_R} fill={k.L.core} stroke={k.L.glow} strokeWidth={0.7} />
    </g>
  );
  const motes = [
    [-10, -16, 3.6],
    [9, -22, 3],
    [-2, -30, 2.4],
  ];
  return (
    <g transform={`translate(${BOOK.x} ${BOOK.y}) scale(1.4)`}>
      <ellipse cx={0} cy={-6} rx={34} ry={22} fill={k.url('halo')} />
      <g className={k.cls('rays')} opacity={0.55}>
        <path d="M-3,-4 L-16,-34 L-8,-36Z M3,-4 L8,-36 L16,-34Z M0,-4 L-3,-40 L3,-40Z" fill={k.L.light} opacity={0.6} />
      </g>
      <path d="M0,10 Q-9,5 -19,8 L-18.5,-1 Q-9,-4 0,1 Q9,-4 18.5,-1 L19,8 Q9,5 0,10Z" fill={ACCENT.tealDeep} />
      <path d={PAGE_L} fill={k.L.core} stroke={k.L.glow} strokeWidth={0.7} />
      <path d={PAGE_R} fill={k.L.light} stroke={k.L.glow} strokeWidth={0.7} />
      <path d="M-3,2.5 Q-8,0 -13,1.5 M-3,5 Q-8,2.5 -13,4 M3,2.5 Q8,0 13,1.5 M3,5 Q8,2.5 13,4" stroke={k.L.glow} strokeWidth={0.7} fill="none" />
      {flip}
      {motes.map(([x, y, r], i) =>
        k.animate ? (
          <g key={i} transform={`translate(${x} -6)`}>
            <g className={k.cls('mote')} style={{ animationDelay: `${-i * 1.2}s` }}>
              <path d={sparklePath(r)} fill={k.L.core} />
            </g>
          </g>
        ) : (
          <path key={i} d={sparklePath(r)} transform={`translate(${x} ${y})`} fill={k.L.core} />
        ),
      )}
    </g>
  );
}

function draw(k: Kit) {
  const frame = TONES.stone.left;
  return (
    <g>
      <defs>{roundGrad(k.id('dome'), TONES.roofTeal)}</defs>
      {box(-35, -23, 35, 23, 0, 6, TONES.base)}
      {box(-9, 23, 9, 28, 0, 3, TONES.stone)}
      {box(-9, 21, 9, 25.5, 3, 6, TONES.stone)}
      {box(-32, -20, 32, 20, 6, 66, TONES.cream, undefined, { top: false })}
      <g transform={mat(F)}>
        {WIN_X.map((x) => (
          <rect key={x} x={x - 1.6} y={-58} width={10.7} height={42} rx={1} fill={frame} />
        ))}
        <path d={archD(-9, -46, 18, 40)} fill={frame} />
        <rect x={-32} y={-12} width={64} height={2.5} fill={TONES.stone.top} opacity={0.7} />
      </g>
      <g transform={mat(RF(32))}>
        <rect x={-20} y={-12} width={40} height={2.5} fill={TONES.stone.right} />
        <circle cx={0} cy={-38} r={11} fill={ACCENT.tealDeep} stroke={TONES.cream.top} strokeWidth={1.4} />
        <path d="M0,-41 Q-4,-44 -8,-42 L-8,-34 Q-4,-36 0,-33 Q4,-36 8,-34 L8,-42 Q4,-44 0,-41Z M0,-41 L0,-33" fill={TONES.cream.top} stroke={ACCENT.tealDeep} strokeWidth={0.8} />
        <rect x={-20} y={-66} width={3} height={54} fill={TONES.cream.right} opacity={0.8} />
        <rect x={17} y={-66} width={3} height={54} fill={TONES.cream.right} opacity={0.8} />
      </g>
      {[0, 1, 2, 3].map((i) => glow(k, i, elems[i].s, 1.4, i))}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          {pane(k, i, elems[i].s)}
          <g transform={mat(F)}>{spines(WIN_X[i], i + 1, k.lit(i))}</g>
        </g>
      ))}
      {glow(k, 5, elems[5].s, 1.5)}
      {pane(k, 5, elems[5].s)}
      <g transform={mat(F)} stroke={k.lit(5) ? INK.frame : UNLIT.windowFrame} strokeWidth={1.2} fill="none" opacity={0.75}>
        <path d="M0,-37 L0,-6 M-7,-30 L7,-30" />
      </g>
      {box(-33.5, -21.5, 33.5, 21.5, 62, 68, TONES.stone)}
      {box(-26, -12, 26, 12, 68, 96, TONES.cream, undefined, { top: false })}
      <g transform={mat(U)}>
        <rect x={-19.5} y={-91.5} width={39} height={16} rx={1} fill={frame} />
      </g>
      {glow(k, 4, elems[4].s, 1.1)}
      {pane(k, 4, elems[4].s)}
      <g transform={mat(U)} stroke={k.lit(4) ? INK.frame : UNLIT.windowFrame} strokeWidth={1.2} opacity={0.75}>
        <path d="M-10.8,-90 L-10.8,-77 M-3.6,-90 L-3.6,-77 M3.6,-90 L3.6,-77 M10.8,-90 L10.8,-77" />
      </g>
      {box(-27.5, -13.5, 27.5, 13.5, 93, 98, TONES.stone)}
      <path d={cylD(0, 0, 20, 98, 107)} fill={TONES.cream.left} stroke={TONES.cream.edge} strokeWidth={0.8} strokeOpacity={0.6} />
      <path d={`M-21,-107 A21,20 0 0 1 21,-107 A21,10.5 0 0 1 -21,-107Z`} fill={k.url('dome')} stroke={TONES.roofTeal.edge} strokeWidth={1} strokeOpacity={0.7} />
      <g fill="none" stroke={TONES.roofTeal.edge} strokeWidth={0.9} opacity={0.55}>
        {[-0.95, -0.55, 0, 0.55, 0.95].map((s) => {
          const xb = 21 * s;
          const yb = -107 + 10.5 * Math.sqrt(1 - s * s);
          return <path key={s} d={`M${n(xb)},${n(yb)} Q${n(xb * 0.92)},${n(yb - 17)} 0,-127`} />;
        })}
      </g>
      <path d={cylD(0, 0, 4.5, 125, 133)} fill={TONES.cream.left} />
      <path d="M-6,-133 L0,-140 L6,-133Z" fill={TONES.roofTeal.top} />
      {k.done ? openBook(k) : null}
    </g>
  );
}

function css(u: string): string {
  return `
.${u}-flip{transform-box:view-box;transform-origin:0 0;animation:${u}-flip 4.2s ease-in-out infinite}
@keyframes ${u}-flip{0%{transform:scaleX(1);opacity:0}12%{opacity:1}55%{transform:scaleX(-1);opacity:1}70%,100%{transform:scaleX(-1);opacity:0}}
.${u}-mote{transform-box:view-box;transform-origin:0 0;animation:${u}-mote 3.6s ease-out infinite}
@keyframes ${u}-mote{0%{transform:translate(0,0) scale(.4);opacity:0}25%{opacity:1}100%{transform:translate(0,-34px) scale(1);opacity:0}}
.${u}-rays{animation:${u}-rays 3.6s ease-in-out infinite}
@keyframes ${u}-rays{0%,100%{opacity:.35}50%{opacity:.75}}
`;
}

export const library: BuildingModule = {
  elems,
  draw,
  css,
  spill: { cx: -12, cy: 22, rx: 100, ry: 24 },
  burst: [0, -72],
  top: -141,
};
