import { useId } from 'react';
import type { DemoWindowProps } from '../types';
import { ACCENT, THEME_LIGHTS, UNLIT } from '../palette';
import { TONES, INK } from './materials';
import { LF, RF, P, mat, n, pts, sparklePath, splitRgba, line } from './iso';
import { box, edge } from './parts';

/** Onboarding demo: one cosy window on a wall piece; panes light in the order TL, TR, BL, BR. */

const F = LF(12);
const PANES: [number, number][] = [
  [-30, -104],
  [2, -104],
  [-30, -72],
  [2, -72],
];
const PANE = 28;

export function DemoWindow({ lit, animate, title, className }: DemoWindowProps) {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const u = `lw${raw}`;
  const L = THEME_LIGHTS.warm;
  const halo = splitRgba(L.halo);
  const count = Math.min(4, Math.max(0, Math.floor(lit)));
  const roof = TONES.roofRed;
  const roofFront = [P(-60, 20, 122), P(60, 20, 122), P(60, -4, 146), P(-60, -4, 146)];
  const roofEnd = [P(60, 20, 122), P(60, -4, 146), P(60, -20, 130), P(60, -20, 124), P(60, -4, 140), P(60, 20, 116)];
  return (
    <svg viewBox="0 0 240 240" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <radialGradient id={`${u}-lit`} cx="50%" cy="42%" r="70%">
          <stop offset="0" stopColor={L.core} />
          <stop offset="0.55" stopColor={L.light} />
          <stop offset="1" stopColor={L.glow} />
        </radialGradient>
        <radialGradient id={`${u}-halo`}>
          <stop offset="0" stopColor={halo.color} stopOpacity={n(Math.min(0.95, halo.opacity * 1.9))} />
          <stop offset="1" stopColor={halo.color} stopOpacity="0" />
        </radialGradient>
      </defs>
      {animate ? (
        <style>{`
.${u}-on{transform-box:fill-box;transform-origin:50% 50%;animation:${u}-on .5s ease-out 1 both}
@keyframes ${u}-on{0%{opacity:0;transform:scale(.85)}60%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
.${u}-tw{animation:${u}-tw 2.8s ease-in-out infinite}
@keyframes ${u}-tw{0%,100%{opacity:1}50%{opacity:.4}}
`}</style>
      ) : null}
      <g transform="translate(120 200)">
        {count === 4 ? <ellipse cx={-6} cy={22} rx={96} ry={22} fill={`url(#${u}-halo)`} /> : null}
        {box(-56, -16, 56, 16, 0, 8, TONES.base)}
        {box(-52, -12, 52, 12, 8, 124, TONES.plaster, undefined, { top: false })}
        <g transform={mat(F)}>
          <rect x={-52} y={-22} width={104} height={14} fill={TONES.stone.left} />
          <path d="M-52,-15 L52,-15 M-30,-22 L-30,-15 M-6,-22 L-6,-15 M18,-22 L18,-15 M42,-22 L42,-15 M-42,-15 L-42,-8 M-18,-15 L-18,-8 M6,-15 L6,-8 M30,-15 L30,-8" stroke={TONES.stone.edge} strokeWidth={0.8} opacity={0.5} />
          <rect x={-46} y={-110} width={9} height={72} rx={1.5} fill={ACCENT.tealDeep} stroke={ACCENT.teal} strokeWidth={0.8} />
          <rect x={37} y={-110} width={9} height={72} rx={1.5} fill={ACCENT.tealDeep} stroke={ACCENT.teal} strokeWidth={0.8} />
          <path d="M-44,-96 L-39,-96 M-44,-52 L-39,-52 M39,-96 L44,-96 M39,-52 L44,-52" stroke={ACCENT.teal} strokeWidth={1.2} />
          <rect x={-35} y={-110} width={70} height={72} rx={2.5} fill={INK.frameLight} />
        </g>
        <g transform={mat(RF(52))}>
          <rect x={-12} y={-22} width={24} height={14} fill={TONES.stone.right} />
        </g>
        {PANES.map(([x, y], i) => (
          <g key={i} transform={mat(F)}>
            <rect x={x} y={y} width={PANE} height={PANE} rx={1.5} fill={UNLIT.windowFill} stroke={UNLIT.windowFrame} strokeWidth={1.6} />
            <path d={`M${x + 5},${y + 12} L${x + 12},${y + 5}`} stroke={UNLIT.edge} strokeWidth={1.4} strokeLinecap="round" opacity={0.45} />
          </g>
        ))}
        {PANES.slice(0, count).map(([x, y], i) => {
          const c = P(x + PANE / 2, 12, -(y + PANE / 2));
          return (
            <g key={`on${i}`} className={animate ? `${u}-on` : undefined}>
              <ellipse cx={n(c[0])} cy={n(c[1])} rx={30} ry={30} fill={`url(#${u}-halo)`} />
              <g transform={mat(F)}>
                <rect x={x} y={y} width={PANE} height={PANE} rx={1.5} fill={`url(#${u}-lit)`} stroke={L.glow} strokeWidth={1.2} />
                <path d={`M${x + 5},${y + 11} L${x + 11},${y + 5}`} stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
              </g>
            </g>
          );
        })}
        {box(-40, 12, 40, 22, 26, 34, TONES.wood)}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const p = P(-36 + i * 12, 17, 37 + (i % 2) * 2);
          return (
            <g key={i}>
              <circle cx={n(p[0])} cy={n(p[1])} r={5} fill={i % 2 ? INK.leafDark : INK.leaf} />
              {i % 2 === 0 ? <circle cx={n(p[0] + 1)} cy={n(p[1] - 3)} r={2.2} fill={i % 4 === 0 ? INK.flagA : INK.flagB} /> : null}
            </g>
          );
        })}
        <polygon points={pts(roofFront)} fill={roof.top} />
        <path d={line([P(-58, 14, 128), P(58, 14, 128)]) + line([P(-58, 8, 134), P(58, 8, 134)]) + line([P(-58, 2, 140), P(58, 2, 140)])} stroke={roof.edge} strokeWidth={1} opacity={0.35} />
        <polygon points={pts([P(-60, 20, 122), P(60, 20, 122), P(60, 20, 116), P(-60, 20, 116)])} fill={roof.left} />
        <polygon points={pts(roofEnd)} fill={roof.right} />
        <path d={line(roofFront, true)} {...edge(roof)} />
        {count === 4 ? (
          <g>
            {[
              [-78, -150, 9],
              [62, -170, 7],
              [70, -96, 6],
            ].map(([x, y, r], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <g className={animate ? `${u}-tw` : undefined} style={animate ? { animationDelay: `${-i * 0.9}s` } : undefined}>
                  <path d={sparklePath(r)} fill={L.core} stroke={L.glow} strokeWidth={0.8} />
                </g>
              </g>
            ))}
          </g>
        ) : null}
      </g>
    </svg>
  );
}