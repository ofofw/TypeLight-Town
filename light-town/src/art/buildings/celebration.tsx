import { useId } from 'react';
import type { ReactNode } from 'react';
import type { TownCelebrationProps } from '../types';
import type { LightPalette } from '../palette';
import { THEME_LIGHTS } from '../palette';
import { INK } from './materials';
import { line, n, sparklePath, splitRgba } from './iso';
import type { Pt } from './iso';

/** 全镇庆祝: lanterns drift up and sparkles bloom once (≤ 2 s), or a static garland frame. */

const LANTERNS: [number, number, number, string][] = [
  [150, 0.95, 0.05, 'A'],
  [270, 0.8, 0.25, 'B'],
  [390, 1.1, 0.1, 'C'],
  [500, 0.85, 0.3, 'A'],
  [610, 1.15, 0.0, 'B'],
  [720, 0.9, 0.2, 'C'],
  [830, 1.05, 0.12, 'A'],
  [940, 0.8, 0.28, 'B'],
  [1050, 1, 0.08, 'C'],
];

const SPARKS: [number, number, number, number][] = [
  [200, 220, 16, 0.2],
  [330, 140, 12, 0.5],
  [460, 260, 18, 0.35],
  [560, 120, 13, 0.7],
  [660, 230, 20, 0.15],
  [760, 150, 12, 0.55],
  [880, 250, 17, 0.4],
  [1000, 160, 14, 0.25],
  [260, 360, 11, 0.6],
  [940, 380, 12, 0.65],
  [600, 330, 14, 0.45],
  [120, 300, 10, 0.75],
  [1090, 300, 10, 0.3],
];

function lantern(L: LightPalette, haloId: string): ReactNode {
  return (
    <g>
      <circle cx={0} cy={-6} r={34} fill={`url(#${haloId})`} />
      <path d="M-13,-26 Q-15,-6 -10,10 L10,10 Q15,-6 13,-26 Q0,-31 -13,-26Z" fill={L.light} stroke={L.glow} strokeWidth={1.4} />
      <path d="M-6,-27 Q-8,-6 -5,9 M6,-27 Q8,-6 5,9" fill="none" stroke={L.glow} strokeWidth={1} opacity={0.7} />
      <ellipse cx={0} cy={-2} rx={6} ry={9} fill={L.core} opacity={0.9} />
      <rect x={-8} y={9} width={16} height={4} rx={1.5} fill={L.glow} />
    </g>
  );
}

function css(u: string): string {
  return `
.${u}-all{animation:${u}-all 2s linear 1 forwards}
@keyframes ${u}-all{0%,72%{opacity:1}100%{opacity:0}}
.${u}-wash{animation:${u}-wash 1.8s ease-out 1 forwards}
@keyframes ${u}-wash{0%{opacity:0}35%{opacity:1}100%{opacity:0}}
.${u}-rA,.${u}-rB,.${u}-rC{transform-box:view-box;transform-origin:0 0;animation:${u}-rA 1.68s cubic-bezier(.25,.6,.35,1) 1 both}
.${u}-rB{animation-name:${u}-rB}
.${u}-rC{animation-name:${u}-rC}
@keyframes ${u}-rA{0%{transform:translate(0,0) scale(.7);opacity:0}18%{opacity:1}55%{transform:translate(14px,-230px) scale(.95)}100%{transform:translate(4px,-420px) scale(.85);opacity:.85}}
@keyframes ${u}-rB{0%{transform:translate(0,0) scale(.7);opacity:0}18%{opacity:1}55%{transform:translate(-16px,-200px) scale(.9)}100%{transform:translate(-6px,-360px) scale(.8);opacity:.85}}
@keyframes ${u}-rC{0%{transform:translate(0,0) scale(.7);opacity:0}18%{opacity:1}55%{transform:translate(10px,-260px) scale(1)}100%{transform:translate(-4px,-470px) scale(.9);opacity:.85}}
.${u}-pop{transform-box:view-box;transform-origin:0 0;animation:${u}-pop 1.15s ease-out 1 both}
@keyframes ${u}-pop{0%{transform:scale(0) rotate(0deg);opacity:0}40%{transform:scale(1.15) rotate(20deg);opacity:1}100%{transform:scale(.55) rotate(45deg);opacity:0}}
`;
}

function swag(a: Pt, b: Pt, sag: number, count: number, colors: string[], key: string, glowId: string): ReactNode {
  const pts: Pt[] = Array.from({ length: 17 }, (_, i) => {
    const t = i / 16;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t)] as Pt;
  });
  return (
    <g key={key}>
      <path d={line(pts)} fill="none" stroke="#2A2150" strokeWidth={2} opacity={0.7} />
      {Array.from({ length: count }, (_, i) => {
        const t = (i + 0.5) / count;
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t) + 6;
        return (
          <g key={i}>
            <circle cx={n(x)} cy={n(y)} r={15} fill={`url(#${glowId})`} />
            <circle cx={n(x)} cy={n(y)} r={5.5} fill={colors[i % colors.length]} stroke="#2A2150" strokeWidth={1} strokeOpacity={0.4} />
          </g>
        );
      })}
    </g>
  );
}

function garland(L: LightPalette, glowId: string, haloId: string): ReactNode {
  const bulbs = [L.core, L.light, L.glow];
  const flags = [INK.flagA, INK.flagB, INK.flagC, INK.flagD];
  const topY = 8;
  const pennants: ReactNode[] = [];
  for (let s = 0; s < 4; s += 1) {
    for (let i = 1; i < 6; i += 1) {
      const t = i / 6;
      const x = s * 300 + 300 * t;
      const y = topY + 46 * 4 * t * (1 - t) + 2;
      pennants.push(<path key={`${s}-${i}`} d={`M${n(x - 9)},${n(y)} L${n(x + 9)},${n(y)} L${n(x)},${n(y + 20)}Z`} fill={flags[(s + i) % 4]} opacity={0.9} />);
    }
  }
  return (
    <g>
      {pennants}
      {[0, 1, 2, 3].map((s) => swag([s * 300, topY], [(s + 1) * 300, topY], 46, 5, bulbs, `t${s}`, glowId))}
      {[0, 1, 2, 3].map((s) => swag([s * 300, 716], [(s + 1) * 300, 716], -34, 5, bulbs, `b${s}`, glowId))}
      {[0, 1].map((s) => swag([6, s * 360], [6, (s + 1) * 360], 0, 4, bulbs, `l${s}`, glowId))}
      {[0, 1].map((s) => swag([1194, s * 360], [1194, (s + 1) * 360], 0, 4, bulbs, `r${s}`, glowId))}
      {[
        [70, 120],
        [1130, 120],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(0.9)`}>
          {lantern(L, haloId)}
        </g>
      ))}
      {[
        [210, 110, 10],
        [990, 112, 10],
        [600, 96, 12],
      ].map(([x, y, r], i) => (
        <path key={i} d={sparklePath(r)} transform={`translate(${x} ${y})`} fill={L.core} opacity={0.9} />
      ))}
    </g>
  );
}

export function TownCelebration({ theme, animate }: TownCelebrationProps) {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const u = `lc${raw}`;
  const L = THEME_LIGHTS[theme] ?? THEME_LIGHTS.warm;
  const halo = splitRgba(L.halo);
  const haloId = `${u}-halo`;
  const glowId = `${u}-glow`;
  return (
    <svg viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={haloId}>
          <stop offset="0" stopColor={halo.color} stopOpacity={n(Math.min(0.95, halo.opacity * 2))} />
          <stop offset="1" stopColor={halo.color} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={glowId}>
          <stop offset="0" stopColor={L.light} stopOpacity="0.7" />
          <stop offset="1" stopColor={L.light} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${u}-wash`} cx="50%" cy="100%" r="75%">
          <stop offset="0" stopColor={L.light} stopOpacity="0.4" />
          <stop offset="1" stopColor={L.light} stopOpacity="0" />
        </radialGradient>
      </defs>
      {animate ? (
        <g className={`${u}-all`}>
          <style>{css(u)}</style>
          <rect className={`${u}-wash`} x={0} y={240} width={1200} height={480} fill={`url(#${u}-wash)`} />
          {LANTERNS.map(([x, s, delay, v], i) => (
            <g key={i} transform={`translate(${x} ${700 + (i % 3) * 18}) scale(${s})`}>
              <g className={`${u}-r${v}`} style={{ animationDelay: `${delay}s` }}>
                {lantern(L, haloId)}
              </g>
            </g>
          ))}
          {SPARKS.map(([x, y, r, delay], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <g className={`${u}-pop`} style={{ animationDelay: `${delay}s` }}>
                <circle r={r * 1.8} fill={`url(#${glowId})`} />
                <path d={sparklePath(r)} fill={i % 2 ? L.core : L.light} />
              </g>
            </g>
          ))}
        </g>
      ) : (
        garland(L, glowId, haloId)
      )}
    </svg>
  );
}
