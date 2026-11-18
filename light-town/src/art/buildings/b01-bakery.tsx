import type { ReactNode } from 'react';
import type { BuildingModule, ElemSpec, Kit } from './kit';
import { TONES, INK } from './materials';
import { LF, RF, P, mat, n, pts } from './iso';
import { box, gableY, glow, pane, archD } from './parts';
import { ACCENT } from '../palette';

/** 面包坊 Bakery: oven mouth, two shop-window panes, door glass, upper window, sign lamp. */

const F = LF(24);
const O = RF(42);
const WALL = 92;

const elems: ElemSpec[] = [
  { s: { k: 'arch', x: 6.5, y: -22, w: 9, h: 14, m: O } },
  { s: { k: 'rect', x: -22.5, y: -42.5, w: 10.5, h: 27, m: F } },
  { s: { k: 'rect', x: -10, y: -42.5, w: 10.5, h: 27, m: F } },
  { s: { k: 'arch', x: 9.5, y: -39, w: 9, h: 14, m: F } },
  { s: { k: 'arch', x: -8, y: -86, w: 16, h: 24, m: F } },
  { s: { k: 'rect', x: -58, y: -73, w: 6.5, h: 9, r: 1.6, m: F } },
];

const CRUST = '#D9A866';
const CRUST_DARK = '#94653D';

function awning(): ReactNode {
  const stripes: ReactNode[] = [];
  for (let i = 0; i < 6; i += 1) {
    const xa = -26 + i * 5;
    const xb = xa + 5;
    stripes.push(
      <polygon
        key={i}
        points={pts([P(xa, 24, 57), P(xb, 24, 57), P(xb, 30, 51), P(xa, 30, 51)])}
        fill={i % 2 ? INK.awningB : INK.awningA}
      />,
    );
  }
  let scallop = 'M-26,-51 L4,-51 L4,-47.5';
  for (let i = 5; i >= 0; i -= 1) {
    const xa = -26 + i * 5;
    scallop += ` A2.5,2.5 0 0 1 ${xa},-47.5`;
  }
  scallop += 'Z';
  return (
    <g>
      {stripes}
      <path d={scallop} transform={mat(LF(30))} fill={INK.awningB} stroke={ACCENT.tealPale} strokeWidth={0.6} strokeOpacity={0.6} />
    </g>
  );
}

function signBoard(k: Kit): ReactNode {
  const lit = k.lit(5);
  return (
    <g>
      <path d="M-4,0 L-4,5 M4,0 L4,5" stroke={INK.frame} strokeWidth={1} />
      <rect x={-7.5} y={5} width={15} height={13.5} rx={2.5} fill={TONES.wood.left} stroke={lit ? k.L.light : INK.frameLight} strokeWidth={1.2} />
      <path d="M-5,14.5 Q-5.6,8.6 0,8.6 Q5.6,8.6 5,14.5Z" fill={CRUST} stroke={CRUST_DARK} strokeWidth={0.7} />
      <path d="M-2.6,10.2 L-1.6,12.8 M0,9.6 L1,12.4 M2.6,10.2 L3.4,12.4" stroke={CRUST_DARK} strokeWidth={0.8} strokeLinecap="round" />
    </g>
  );
}

function sign(k: Kit): ReactNode {
  const swinging = k.done && k.animate;
  return (
    <g transform={mat(F)}>
      <path d="M-28,-76 L-55,-76" stroke={INK.frame} strokeWidth={1.8} strokeLinecap="round" />
      <path d="M-28,-67 Q-30,-75 -36,-76" fill="none" stroke={INK.frame} strokeWidth={1.3} />
      <circle cx={-36} cy={-72.5} r={1.6} fill="none" stroke={INK.frame} strokeWidth={1} />
      <g transform="translate(-41 -76)">
        {swinging ? (
          <g className={k.cls('swing')}>{signBoard(k)}</g>
        ) : (
          <g transform={k.done ? 'rotate(7)' : undefined}>{signBoard(k)}</g>
        )}
        {k.done && !k.animate ? (
          <g fill="none" stroke={k.L.light} strokeWidth={1.1} strokeLinecap="round" opacity={0.85}>
            <path d="M-12,12 Q-13.5,17 -11,21" />
            <path d="M13,8 Q15,13 13.5,18" />
          </g>
        ) : null}
      </g>
      <path d="M-54.75,-76 L-54.75,-73" stroke={INK.frame} strokeWidth={1} />
    </g>
  );
}

function timber(): ReactNode {
  return (
    <g fill={TONES.wood.left}>
      <rect x={-28} y={-60} width={56} height={3} />
      <rect x={-28} y={-WALL} width={3} height={WALL - 5} />
      <rect x={25} y={-WALL} width={3} height={WALL - 5} />
      <path d="M-25,-63 L-15,-89 L-12,-89 L-22,-63Z M25,-63 L15,-89 L12,-89 L22,-63Z" />
    </g>
  );
}

function draw(k: Kit) {
  return (
    <g>
      {box(-31, -27, 31, 27, 0, 5, TONES.base)}
      {box(-28, -24, 28, 24, 5, WALL, TONES.brick, undefined, { top: false })}
      <g transform={mat(F)}>
        {timber()}
        <rect x={-25} y={-45} width={28} height={32} rx={1} fill={TONES.darkWood.left} />
        <rect x={-25} y={-13} width={28} height={8} fill={TONES.wood.top} />
        <path d="M-23,-9 L1,-9" stroke={TONES.darkWood.left} strokeWidth={1} />
        <rect x={7} y={-43} width={14} height={38} rx={1.5} fill={INK.frameLight} />
        <path d={archD(8, -41.5, 12, 36.5)} fill={INK.door} />
        <circle cx={17.5} cy={-20} r={1.1} fill={INK.frameLight} />
        <rect x={-11} y={-90} width={22} height={30} rx={1} fill={INK.frameLight} />
      </g>
      <g transform={mat(RF(28))} fill={TONES.wood.right}>
        <rect x={-24} y={-60} width={48} height={3} />
        <rect x={-24} y={-WALL} width={3} height={WALL - 5} />
        <rect x={21} y={-WALL} width={3} height={WALL - 5} />
        <path d="M-20,-63 L-6,-89 L-3,-89 L-17,-63Z" />
      </g>
      {glow(k, 1, elems[1].s)}
      {glow(k, 2, elems[2].s)}
      {glow(k, 3, elems[3].s)}
      {glow(k, 4, elems[4].s)}
      {pane(k, 1, elems[1].s)}
      {pane(k, 2, elems[2].s)}
      {pane(k, 3, elems[3].s)}
      {pane(k, 4, elems[4].s)}
      <g transform={mat(F)} stroke={INK.frame} strokeWidth={1.1} opacity={0.6}>
        <path d="M-8,-74 L8,-74 M0,-86 L0,-62" />
        <path d="M-22.5,-33 L0.5,-33" />
      </g>
      {box(-12, 24, 12, 28, 55.5, 59.5, TONES.wood)}
      {[0, 1, 2, 3, 4].map((i) => {
        const p = P(-10 + i * 5, 26, 61.5 + (i % 2));
        return <circle key={i} cx={n(p[0])} cy={n(p[1])} r={3} fill={i % 2 ? INK.leafDark : INK.leaf} />;
      })}
      {[0, 2, 4].map((i) => {
        const p = P(-10 + i * 5, 26, 64);
        return <circle key={i} cx={n(p[0] + 0.5)} cy={n(p[1])} r={1.3} fill={INK.flagB} />;
      })}
      {awning()}
      {box(28, -20, 42, -2, 0, 27, TONES.brick)}
      {box(29.5, -18.5, 40.5, -3.5, 27, 33, TONES.stone)}
      <g transform={mat(O)}>
        <path d={archD(4.5, -24, 13, 17)} fill={TONES.stone.right} />
        <path d="M1,-4 L21,-4" stroke={TONES.stone.left} strokeWidth={2} />
      </g>
      {glow(k, 0, elems[0].s, 2.2)}
      {pane(k, 0, elems[0].s)}
      {k.lit(0) ? (
        <g transform={mat(O)}>
          <path d="M8,-9 Q9.5,-13 11,-9 Q12.5,-14 14,-9Z" fill={k.L.glow} opacity={0.9} />
        </g>
      ) : null}
      {gableY(-28, -24, 28, 24, WALL, 128, TONES.roofSlate, TONES.brick, 5, 4)}
      <g transform={mat(F)}>
        <circle cx={0} cy={-104} r={6} fill={TONES.wood.left} stroke={INK.frameLight} strokeWidth={1} />
        <path d="M0,-108.5 L0,-99.5 M-2.6,-106 L0,-103.5 L2.6,-106 M-2.6,-102.5 L0,-100 L2.6,-102.5" stroke={CRUST} strokeWidth={1} fill="none" strokeLinecap="round" />
      </g>
      {box(31, -15, 39, -7, 33, 126, TONES.brick)}
      {box(30, -16, 40, -6, 124, 129, TONES.stone)}
      {sign(k)}
      {glow(k, 5, elems[5].s, 2.3)}
      <g transform={mat(F)}>
        <path d="M-59,-73 L-54.75,-76.5 L-50.5,-73Z" fill={INK.frame} />
      </g>
      {pane(k, 5, elems[5].s)}
    </g>
  );
}

function css(u: string): string {
  return `
.${u}-swing{transform-box:view-box;transform-origin:0 0;animation:${u}-swing 3.4s ease-in-out infinite}
@keyframes ${u}-swing{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}
`;
}

export const bakery: BuildingModule = {
  elems,
  draw,
  css,
  spill: { cx: -8, cy: 22, rx: 100, ry: 24 },
  burst: [-6, -72],
  top: -146,
};
