import type { ReactNode } from 'react';
import type { BuildingModule, ElemSpec, Kit, Shape } from './kit';
import { TONES, INK } from './materials';
import { n, line } from './iso';
import type { Mat } from './iso';
import { cylD, glow, pane, roundGrad, archD, shapeEl } from './parts';
import { UNLIT } from '../palette';

/** 音乐屋 Music House: six note-shaped windows lit left to right; notes float out of the horn. */

const RW = 52;
const ZT = 86;
export const NOTE_D =
  'M-5.6,1.8 A5.8,4.2 -20 1 1 5.4,-2 A5.8,4.2 -20 1 1 -5.6,1.8Z M3.4,-1 L3.4,-21 L5.8,-21 L5.8,-1.2Z M5.8,-21 C12,-17.5 13.5,-12 10.5,-6.5 C11,-10.5 9.5,-13.5 5.8,-14.8Z';
const NOTE_BOX = [-6.2, -21.5, 11.5, 5] as const;
const ANGLES = [-54, -32, -12, 12, 32, 54];
const ZS = [30, 42, 51, 51, 42, 30];
const BRASS = { light: '#E3C27E', mid: '#C29A5B', dark: '#8E6A3C' };

function noteMat(i: number): Mat {
  const a = (ANGLES[i] * Math.PI) / 180;
  const x = RW * Math.sin(a);
  const y = (RW / 2) * Math.cos(a) - ZS[i];
  const tilt = ((i % 2 ? 6 : -4) * Math.PI) / 180;
  const fx = Math.cos(a);
  return [fx * Math.cos(tilt), Math.sin(tilt), -fx * Math.sin(tilt), Math.cos(tilt), x, y];
}

const noteShape = (i: number): Shape => ({ k: 'path', d: NOTE_D, box: NOTE_BOX, m: noteMat(i) });
const elems: ElemSpec[] = ANGLES.map((_, i) => ({ s: noteShape(i) }));

const BELL = { x: 46, y: -160, rot: -38 };

function horn(k: Kit): ReactNode {
  return (
    <g>
      <path d="M16,-112 Q22,-146 44,-158" fill="none" stroke={BRASS.dark} strokeWidth={8} strokeLinecap="round" />
      <path d="M16,-112 Q22,-146 44,-158" fill="none" stroke={BRASS.mid} strokeWidth={5.5} strokeLinecap="round" />
      <path d="M17,-116 Q22,-144 41,-156" fill="none" stroke={BRASS.light} strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
      <g transform={`translate(${BELL.x} ${BELL.y}) rotate(${BELL.rot})`}>
        <path d="M-2,-4 C7,-4.5 12,-9 17,-15 L17,15 C12,9 7,4.5 -2,4Z" fill={BRASS.mid} stroke={BRASS.dark} strokeWidth={0.8} />
        <path d="M0,-3 C7,-3.5 11,-7 15,-11" fill="none" stroke={BRASS.light} strokeWidth={1.4} opacity={0.75} />
        <ellipse cx={17} cy={0} rx={4.5} ry={15} fill={BRASS.light} stroke={BRASS.dark} strokeWidth={0.8} />
        <ellipse cx={17.5} cy={0} rx={3} ry={12} fill={k.done ? k.L.light : '#3A3157'} />
        {k.done ? <ellipse cx={17.8} cy={0} rx={1.8} ry={7} fill={k.L.core} /> : null}
      </g>
    </g>
  );
}

const FLOAT_START = { x: 58, y: -176 };

function floatingNotes(k: Kit): ReactNode {
  const note = (s: number) => (
    <g transform={`scale(${s})`}>
      <path d={NOTE_D} fill={k.L.light} stroke={k.L.glow} strokeWidth={0.9} />
    </g>
  );
  if (k.animate) {
    return (
      <g transform={`translate(${FLOAT_START.x} ${FLOAT_START.y})`}>
        {[0, 1, 2, 3].map((i) => (
          <g key={i} className={k.cls(i % 2 ? 'noteB' : 'noteA')} style={{ animationDelay: `${-i * 1.4}s` }}>
            <circle r={11} fill={k.url('halo')} />
            {note(i % 2 ? 0.62 : 0.75)}
          </g>
        ))}
      </g>
    );
  }
  const still: [number, number, number, number, number][] = [
    [4, -12, 0.78, 1, -8],
    [-8, -38, 0.68, 0.9, 6],
    [8, -64, 0.6, 0.72, -6],
    [-2, -88, 0.5, 0.55, 8],
  ];
  return (
    <g>
      <path
        d={line(still.map(([x, y]) => [FLOAT_START.x + x, FLOAT_START.y + y + 6]))}
        fill="none"
        stroke={k.L.light}
        strokeWidth={1.2}
        strokeDasharray="1.5 4"
        strokeLinecap="round"
        opacity={0.6}
      />
      {still.map(([x, y, s, o, r], i) => (
        <g key={i} transform={`translate(${FLOAT_START.x + x} ${FLOAT_START.y + y}) rotate(${r})`} opacity={o}>
          <circle r={11 * s + 3} fill={k.url('halo')} />
          {note(s)}
        </g>
      ))}
    </g>
  );
}

function draw(k: Kit) {
  const scallops: ReactNode[] = [];
  for (let i = 0; i <= 12; i += 1) {
    const a = (Math.PI * i) / 12;
    scallops.push(<circle key={i} cx={n(59 * Math.cos(a))} cy={n(-88 + 29.5 * Math.sin(a) + 0.5)} r={3.4} fill={i % 2 ? BRASS.mid : BRASS.light} stroke={BRASS.dark} strokeWidth={0.6} />);
  }
  return (
    <g>
      <defs>
        {roundGrad(k.id('wall'), TONES.lilac)}
        {roundGrad(k.id('roof'), TONES.roofPlum)}
        {roundGrad(k.id('base'), TONES.base)}
      </defs>
      <path d={cylD(0, 0, 56, 0, 6)} fill={k.url('base')} stroke={TONES.base.edge} strokeWidth={0.8} strokeOpacity={0.6} />
      <path d={cylD(0, 0, RW, 6, ZT)} fill={k.url('wall')} stroke={TONES.lilac.edge} strokeWidth={1} strokeOpacity={0.7} />
      <path d={`M-52,-40 A52,26 0 0 0 52,-40`} fill="none" stroke={TONES.lilac.edge} strokeWidth={1} opacity={0.35} />
      <path d={archD(-10, -16, 20, 38)} fill={BRASS.mid} />
      <path d={archD(-8, -14, 16, 34)} fill={INK.door} />
      <path d="M0,-6 L0,20" stroke={INK.doorDark} strokeWidth={1} />
      <circle cx={4} cy={4} r={1.1} fill={BRASS.light} />
      {ANGLES.map((_, i) => glow(k, i, noteShape(i), 1.25, `g${i}`))}
      {ANGLES.map((_, i) => (
        <g key={i}>
          {shapeEl(noteShape(i), { fill: k.lit(i) ? k.L.glow : UNLIT.windowFill, stroke: k.lit(i) ? BRASS.light : '#4A3B68', strokeWidth: 3.4, strokeLinejoin: 'round' })}
          {pane(k, i, noteShape(i))}
        </g>
      ))}
      <path d={cylD(0, 0, RW + 1, ZT - 4, ZT)} fill={BRASS.mid} opacity={0.9} />
      {horn(k)}
      <path d="M-59,-88 L0,-150 L59,-88 A59,29.5 0 0 1 -59,-88Z" fill={k.url('roof')} stroke={TONES.roofPlum.edge} strokeWidth={1} strokeOpacity={0.7} />
      <path d="M0,-150 L-21,-61 M0,-150 L21,-61 M0,-150 L-44,-69 M0,-150 L44,-69" stroke={TONES.roofPlum.edge} strokeWidth={0.9} opacity={0.35} />
      {scallops}
      <circle cx={0} cy={-151} r={3.2} fill={BRASS.light} stroke={BRASS.dark} strokeWidth={0.7} />
      <g transform="translate(-1 -158) scale(0.55)">
        <path d={NOTE_D} fill={BRASS.light} stroke={BRASS.dark} strokeWidth={1.2} />
      </g>
      {k.done ? floatingNotes(k) : null}
    </g>
  );
}

function css(u: string): string {
  return `
.${u}-noteA,.${u}-noteB{transform-box:view-box;transform-origin:0 0;animation:${u}-noteA 5.6s ease-in-out infinite}
.${u}-noteB{animation-name:${u}-noteB}
@keyframes ${u}-noteA{0%{transform:translate(0,0) rotate(-10deg) scale(.5);opacity:0}15%{opacity:1}50%{transform:translate(14px,-48px) rotate(8deg) scale(.9)}80%{opacity:.8}100%{transform:translate(2px,-94px) rotate(-6deg) scale(1);opacity:0}}
@keyframes ${u}-noteB{0%{transform:translate(0,0) rotate(8deg) scale(.5);opacity:0}15%{opacity:1}50%{transform:translate(-10px,-44px) rotate(-8deg) scale(.85)}80%{opacity:.8}100%{transform:translate(8px,-88px) rotate(6deg) scale(.95);opacity:0}}
`;
}

export const musicHouse: BuildingModule = {
  elems,
  draw,
  css,
  spill: { cx: 0, cy: 22, rx: 96, ry: 24 },
  burst: [0, -70],
  top: -180,
};
