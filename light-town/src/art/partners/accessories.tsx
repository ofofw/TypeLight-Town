import { useId } from 'react';
import type { AccessoryIconProps } from '../types';
import type { AccessorySlot } from '../../config/shop';
import { accessoryById } from '../../config/shop';
import { UI } from '../palette';
import { GLOW, OUTLINE, Shade, num, rr, sparklePath, starPath } from './shared';
import type { Tone } from './shared';

/* ------------------------------------------------------------------ hats --
 * Local coordinates: origin at the bottom centre where the hat rests on the head,
 * y grows downwards (hats rise into negative y). Nominal width about 46.
 */

const LEAF: Tone = { main: '#7CCB5E', light: '#B0E78B', dark: '#4E9C45' };
const VEIN = '#3D8740';
const HAT_BLUE: Tone = { main: '#6D7CF0', light: '#9DA8FF', dark: '#4A57C2' };
const GOLD: Tone = { main: '#FFC94D', light: '#FFE7A0', dark: '#D3972A' };
const GEM_TEAL = '#3CC9B4';
const GEM_PINK = '#FF8FB8';

function LeafHat({ p }: { p: string }) {
  const cap = 'M-23 1C-24 -12 -13 -21 0 -21C13 -21 24 -12 23 1C8 4.5 -8 4.5 -23 1Z';
  const leaf = 'M-1 -18.5C3 -31 13 -37 26 -36C23 -24 13 -16.5 1 -16.5Z';
  return (
    <g>
      <path d="M-2.5 -18C-4 -26 -9.5 -30.5 -15 -28" fill="none" stroke={OUTLINE} strokeWidth={5} strokeLinecap="round" />
      <path d="M-2.5 -18C-4 -26 -9.5 -30.5 -15 -28" fill="none" stroke="#8C6A3A" strokeWidth={2.4} strokeLinecap="round" />
      <Shade id={`${p}-hl1`} d={leaf} tone={LEAF} sw={2.3}>
        <path d="M1 -17.5C8 -24 15 -30 23 -34" fill="none" stroke={VEIN} strokeWidth={1.5} strokeLinecap="round" />
      </Shade>
      <Shade id={`${p}-hl2`} d={cap} tone={LEAF} sw={2.4}>
        <path
          d="M0 -20C-1 -12 -1.5 -5 -2 3M-1 -13C-6 -14 -11 -12 -15 -8M-1.6 -6C-7 -7 -13 -4.5 -18 -0.5M-0.6 -13C5 -14 10 -12 14 -8M-1 -6C5 -7 12 -4.5 17 -0.5"
          fill="none"
          stroke={VEIN}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <ellipse cx={-10} cy={-15} rx={5} ry={2.4} fill={LEAF.light} transform="rotate(-28 -10 -15)" />
      </Shade>
    </g>
  );
}

function StarHat({ p }: { p: string }) {
  const cone = 'M-21 1C-14 -12 -6 -28 4 -41C7 -27 14 -12 21 1C7 4.5 -7 4.5 -21 1Z';
  const band = 'M-22.5 1.8C-7 5.8 7 5.8 22.5 1.8L20.8 -5.6C7 -2.2 -7 -2.2 -20.8 -5.6Z';
  return (
    <g>
      <circle cx={5} cy={-45} r={15} fill={`url(#${p}-halo)`} />
      <Shade id={`${p}-hs1`} d={cone} tone={HAT_BLUE} sw={2.4}>
        <path d={starPath(-7, -13, 3.6, 1.7)} fill={GOLD.light} />
        <path d={starPath(6, -22, 2.9, 1.4)} fill={GOLD.light} />
        <path d={starPath(-1, -31, 2.3, 1.1)} fill={GOLD.light} />
        <path d="M-12 -6C-8 -16 -4 -25 1 -33" fill="none" stroke={HAT_BLUE.light} strokeWidth={2.4} strokeLinecap="round" opacity={0.8} />
      </Shade>
      <Shade id={`${p}-hs2`} d={band} tone={GOLD} dx={0} dy={-2} sw={2.3} />
      <path d={starPath(5, -45, 8.5, 4)} fill={GLOW.light} stroke={OUTLINE} strokeWidth={2.2} strokeLinejoin="round" />
      <path d={starPath(4.4, -45.6, 3.8, 1.9)} fill={GLOW.core} />
    </g>
  );
}

function MoonCrown({ p }: { p: string }) {
  const crown = 'M-21 0L-23.5 -20L-12 -11L0 -25L12 -11L23.5 -20L21 0C7 3 -7 3 -21 0Z';
  const band = 'M-21.4 0.2C-7 3.2 7 3.2 21.4 0.2L22.2 -7.6C7 -4.6 -7 -4.6 -22.2 -7.6Z';
  const moon = 'M3 -39.5A9 9 0 1 0 3 -22.5A12 12 0 0 1 3 -39.5Z';
  return (
    <g>
      <circle cx={-2} cy={-31} r={17} fill={`url(#${p}-halo)`} />
      <Shade id={`${p}-hm1`} d={crown} tone={GOLD} sw={2.4}>
        <path d="M-16 -9L-20 -16M16 -9L20 -16" stroke={GOLD.light} strokeWidth={2} strokeLinecap="round" />
      </Shade>
      <Shade id={`${p}-hm2`} d={band} tone={GOLD} dx={0} dy={-2} sw={2.3}>
        <path d="M-19 -5.4C-6 -2.6 6 -2.6 19 -5.4" fill="none" stroke={GOLD.light} strokeWidth={1.4} />
      </Shade>
      <circle cx={-23.5} cy={-21.5} r={3} fill="#FFF6E2" stroke={OUTLINE} strokeWidth={1.8} />
      <circle cx={23.5} cy={-21.5} r={3} fill="#FFF6E2" stroke={OUTLINE} strokeWidth={1.8} />
      <path d={rr(-15.5, -7, 6, 5, 2)} fill={GEM_TEAL} stroke={OUTLINE} strokeWidth={1.5} />
      <path d={rr(9.5, -7, 6, 5, 2)} fill={GEM_TEAL} stroke={OUTLINE} strokeWidth={1.5} />
      <circle cx={0} cy={-4} r={3.3} fill={GEM_PINK} stroke={OUTLINE} strokeWidth={1.5} />
      <circle cx={-1} cy={-5} r={1} fill="#fff" />
      <path d={moon} fill="#FFF0C2" stroke={OUTLINE} strokeWidth={2.2} strokeLinejoin="round" />
      <circle cx={-5.2} cy={-33.5} r={1.5} fill="#FFFFFF" />
      <path d={sparklePath(9.5, -36, 3.2)} fill={GLOW.core} />
    </g>
  );
}

export function HeadItem({ id, p }: { id: string; p: string }) {
  switch (id) {
    case 'leaf-hat':
      return <LeafHat p={p} />;
    case 'star-hat':
      return <StarHat p={p} />;
    case 'moon-crown':
      return <MoonCrown p={p} />;
    default:
      return null;
  }
}

/* --------------------------------------------------------------- scarves --
 * Local coordinates: origin at the front centre of the neck; the band spans
 * x -w..w and the knot with two tails hangs on the wearer's right side (viewer's left).
 */

interface ScarfStyle {
  tone: Tone;
  kind: 'stripes' | 'dots' | 'stars';
  /** Colour of the pattern. */
  accent: string;
  fringe?: string;
}

const SCARVES: Record<string, ScarfStyle> = {
  'scarf-orange': { tone: { main: '#F2683A', light: '#FF9B6E', dark: '#C64C24' }, kind: 'stripes', accent: '#FFE4C0' },
  'scarf-mint': { tone: { main: '#7EE3C6', light: '#B8F6E3', dark: '#45B996' }, kind: 'dots', accent: '#FFFFFF', fringe: '#FFFFFF' },
  'scarf-night': { tone: { main: '#3548B4', light: '#5268DA', dark: '#232F82' }, kind: 'stars', accent: GLOW.light, fringe: GLOW.light },
};

function scarfParts(w: number) {
  const kx = num(-w * 0.3);
  return {
    kx,
    band: `M${-w} -6.5Q0 0.5 ${w} -6.5A6.5 6.5 0 0 1 ${w} 6.5Q0 13.5 ${-w} 6.5A6.5 6.5 0 0 1 ${-w} -6.5Z`,
    tailA: `M${num(kx - 6.5)} 9L${num(kx + 2)} 10L${num(kx - 1)} 38Q${num(kx - 7.5)} 41 ${num(kx - 14)} 37.5Z`,
    tailB: `M${num(kx - 1)} 10L${num(kx + 7.5)} 9L${num(kx + 13)} 31Q${num(kx + 8)} 34.5 ${num(kx + 3)} 33Z`,
    knot: rr(kx - 7.5, 0, 15, 13, 5.5),
  };
}

function ScarfPattern({ style, area, w, kx }: { style: ScarfStyle; area: 'band' | 'a' | 'b'; w: number; kx: number }) {
  const { kind, accent } = style;
  if (kind === 'stripes') {
    if (area === 'band') {
      const xs: number[] = [];
      for (let x = -w + 7; x < w - 3; x += 11) xs.push(x);
      return (
        <g fill={accent}>
          {xs.map((x) => (
            <path key={x} d={`M${num(x)} -10L${num(x + 4)} -10L${num(x + 1)} 16L${num(x - 3)} 16Z`} />
          ))}
        </g>
      );
    }
    return area === 'a' ? (
      <path d={`M${num(kx - 20)} 25L${num(kx + 6)} 27L${num(kx + 6)} 31L${num(kx - 20)} 29Z`} fill={accent} />
    ) : (
      <path d={`M${num(kx - 4)} 21L${num(kx + 18)} 19L${num(kx + 18)} 23L${num(kx - 4)} 25Z`} fill={accent} />
    );
  }
  if (kind === 'dots') {
    const dots: Array<[number, number]> =
      area === 'band'
        ? Array.from({ length: Math.max(2, Math.floor((w * 2) / 10)) }, (_, i) => [-w + 5 + i * 10, i % 2 === 0 ? -1 : 6] as [number, number])
        : area === 'a'
          ? [
              [kx - 3, 18],
              [kx - 6, 29],
            ]
          : [[kx + 6, 21]];
    return (
      <g fill={accent}>
        {dots.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={num(x)} cy={y} r={2} />
        ))}
      </g>
    );
  }
  const stars: Array<[number, number, number]> =
    area === 'band'
      ? Array.from({ length: Math.max(2, Math.floor((w * 2) / 11)) }, (_, i) => [-w + 6 + i * 11, i % 2 === 0 ? 0 : 6, i % 3 === 1 ? 2.2 : 2.8] as [number, number, number])
      : area === 'a'
        ? [
            [kx - 3, 19, 2.8],
            [kx - 7, 30, 2.2],
          ]
        : [[kx + 6, 22, 2.5]];
  return (
    <g fill={accent}>
      {stars.map(([x, y, s]) => (
        <path key={`${x}-${y}`} d={sparklePath(x, y, s)} />
      ))}
    </g>
  );
}

function Fringe({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const n = 4;
  const lines: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const t = (i + 0.5) / n;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    lines.push(`M${num(x)} ${num(y)}l0 4.5`);
  }
  return (
    <>
      <path d={lines.join('')} stroke={OUTLINE} strokeWidth={3.6} strokeLinecap="round" />
      <path d={lines.join('')} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </>
  );
}

export function ScarfItem({ id, p, w }: { id: string; p: string; w: number }) {
  const style = SCARVES[id];
  if (!style) return null;
  const { kx, band, tailA, tailB, knot } = scarfParts(w);
  return (
    <g>
      <Shade id={`${p}-sc1`} d={band} tone={style.tone} dx={0} dy={-3}>
        <ScarfPattern style={style} area="band" w={w} kx={kx} />
        <path d={`M${-w + 2} -4Q0 3 ${w - 2} -4`} fill="none" stroke={style.tone.light} strokeWidth={1.8} opacity={0.7} />
      </Shade>
      {style.fringe && <Fringe x1={kx + 3} y1={32.6} x2={kx + 13} y2={30.8} color={style.fringe} />}
      <Shade id={`${p}-sc2`} d={tailB} tone={style.tone} dx={-1.5} dy={-1}>
        <ScarfPattern style={style} area="b" w={w} kx={kx} />
      </Shade>
      {style.fringe && <Fringe x1={kx - 14} y1={37.4} x2={kx - 1} y2={38.2} color={style.fringe} />}
      <Shade id={`${p}-sc3`} d={tailA} tone={style.tone} dx={-1.5} dy={-1}>
        <ScarfPattern style={style} area="a" w={w} kx={kx} />
      </Shade>
      <Shade id={`${p}-sc4`} d={knot} tone={style.tone} dx={-1.5} dy={-2}>
        <path d={rr(kx - 5, 2.5, 6, 3, 1.5)} fill={style.tone.light} opacity={0.85} />
      </Shade>
      {style.kind === 'stars' && (
        <g>
          <path d="M3.2 -4.4A5 5 0 1 0 3.2 4.4A5.6 5.6 0 0 1 3.2 -4.4Z" transform={`translate(${num(kx)} 6.5)`} fill={GOLD.main} stroke={OUTLINE} strokeWidth={1.6} strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
}

/* ----------------------------------------------------------------- lamps --
 * Local coordinates: origin at the centre of the lamp; about 50 tall.
 */

function FireflyJar({ p }: { p: string }) {
  const g = `${p}-lf`;
  const jar = 'M-8 -14H8C8 -11 13 -9 13 -2V11C13 16.5 9 19.5 4 19.5H-4C-9 19.5 -13 16.5 -13 11V-2C-13 -9 -8 -11 -8 -14Z';
  return (
    <g>
      <defs>
        <radialGradient id={g}>
          <stop offset="0" stopColor="#FBFFC8" stopOpacity={0.95} />
          <stop offset="0.35" stopColor="#E6FA7A" stopOpacity={0.45} />
          <stop offset="1" stopColor="#C8F060" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={0} cy={4} r={27} fill={`url(#${g})`} opacity={0.75} />
      <path d="M-6.5 -19C-6.5 -28 6.5 -28 6.5 -19" fill="none" stroke={OUTLINE} strokeWidth={4.8} strokeLinecap="round" />
      <path d="M-6.5 -19C-6.5 -28 6.5 -28 6.5 -19" fill="none" stroke="#D9B98A" strokeWidth={2.2} strokeLinecap="round" />
      <path d={jar} fill="#BFE9FF" fillOpacity={0.3} />
      <circle cx={0.5} cy={6} r={12} fill={`url(#${g})`} />
      <g transform="rotate(-12 0 4)">
        <ellipse cx={-3.6} cy={0.6} rx={3.8} ry={2.2} fill="#FFFFFF" opacity={0.85} transform="rotate(-35 -3.6 0.6)" />
        <ellipse cx={3} cy={0.2} rx={3.8} ry={2.2} fill="#FFFFFF" opacity={0.85} transform="rotate(35 3 0.2)" />
        <ellipse cx={-0.2} cy={3} rx={2.4} ry={3.4} fill="#3A3466" />
        <circle cx={-0.2} cy={-1.2} r={1.9} fill="#3A3466" />
        <path d="M-1 -2.6L-2.8 -5.6M0.6 -2.6L2 -5.8" stroke="#3A3466" strokeWidth={1} strokeLinecap="round" />
        <circle cx={0.2} cy={7.6} r={3.8} fill="#F2FF8A" />
        <circle cx={0.2} cy={7.6} r={1.9} fill="#FFFFF0" />
      </g>
      <path d={jar} fill="none" stroke={OUTLINE} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M-9.4 -2.5V9.5" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" opacity={0.75} />
      <circle cx={-9.4} cy={13.2} r={1.1} fill="#FFFFFF" opacity={0.75} />
      <path d={rr(-10, -21.5, 20, 8, 3.2)} fill="#C98E58" stroke={OUTLINE} strokeWidth={2.2} />
      <path d="M-7 -18.6H7" stroke="#E6B37E" strokeWidth={1.6} strokeLinecap="round" />
      <path d={sparklePath(15, -10, 2.6)} fill="#F2FF8A" />
      <path d={sparklePath(-16, 15, 2)} fill="#F2FF8A" />
    </g>
  );
}

function FlowerLamp({ p }: { p: string }) {
  const g = `${p}-lw`;
  const PETAL: Tone = { main: '#FFB2CC', light: '#FFDCE8', dark: '#E57FA6' };
  const bell = 'M-13.5 7C-14.5 -6 -8 -14 0 -14C8 -14 14.5 -6 13.5 7C10.5 4.5 7.5 6 5 9.5C3 6.5 -3 6.5 -5 9.5C-7.5 6 -10.5 4.5 -13.5 7Z';
  return (
    <g>
      <defs>
        <radialGradient id={g}>
          <stop offset="0" stopColor="#FFF4DA" stopOpacity={0.95} />
          <stop offset="0.35" stopColor="#FFC6D8" stopOpacity={0.45} />
          <stop offset="1" stopColor="#FF9EC0" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={0} cy={4} r={28} fill={`url(#${g})`} opacity={0.8} />
      <path d="M0 -13C0 -20 -3 -25 -9 -27" fill="none" stroke={OUTLINE} strokeWidth={5.2} strokeLinecap="round" />
      <path d="M0 -13C0 -20 -3 -25 -9 -27" fill="none" stroke="#62BA6E" strokeWidth={2.6} strokeLinecap="round" />
      <path d="M-1 -20C2 -26 9 -27 12 -24C9 -19.5 3 -18 -1 -20Z" fill="#7CCB5E" stroke={OUTLINE} strokeWidth={1.8} strokeLinejoin="round" />
      <ellipse cx={0} cy={9.5} rx={11} ry={5} fill={GLOW.core} />
      <circle cx={0} cy={9} r={10} fill={`url(#${g})`} />
      <path d="M0 6V12.5" stroke={OUTLINE} strokeWidth={3.6} strokeLinecap="round" />
      <path d="M0 6V12.5" stroke="#FFE7A0" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={0} cy={15} r={3.2} fill={GLOW.light} stroke={OUTLINE} strokeWidth={1.8} />
      <circle cx={-0.8} cy={14.2} r={1.1} fill={GLOW.core} />
      <Shade id={`${p}-lw1`} d={bell} tone={PETAL} sw={2.4}>
        <path d="M-7 4C-8 -4 -5 -10 0 -11.5M7 4C8 -4 5 -10 0 -11.5" fill="none" stroke={PETAL.dark} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
        <ellipse cx={-6} cy={-6} rx={3.4} ry={5} fill={PETAL.light} transform="rotate(20 -6 -6)" />
      </Shade>
      <path d="M-4 -14.5Q0 -11.5 4 -14.5" fill="#7CCB5E" stroke={OUTLINE} strokeWidth={1.8} strokeLinejoin="round" />
      <path d={sparklePath(16, -6, 2.6)} fill={GLOW.core} />
      <path d={sparklePath(-15, 16, 2)} fill={GLOW.core} />
    </g>
  );
}

function PlanetLamp({ p }: { p: string }) {
  const g = `${p}-lp`;
  const body = `${p}-lpb`;
  const ring = '#A8EFE2';
  return (
    <g>
      <defs>
        <radialGradient id={g}>
          <stop offset="0" stopColor={GLOW.core} stopOpacity={0.95} />
          <stop offset="0.35" stopColor={GLOW.light} stopOpacity={0.45} />
          <stop offset="1" stopColor={GLOW.glow} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={body} cx="0.36" cy="0.32" r="0.75">
          <stop offset="0" stopColor={GLOW.core} />
          <stop offset="0.55" stopColor={GLOW.light} />
          <stop offset="1" stopColor={GLOW.glow} />
        </radialGradient>
      </defs>
      <circle cx={0} cy={0} r={30} fill={`url(#${g})`} opacity={0.8} />
      <g transform="rotate(-16)">
        <path d="M-24 0A24 7.5 0 0 1 24 0" fill="none" stroke={OUTLINE} strokeWidth={6.4} strokeLinecap="round" />
        <path d="M-24 0A24 7.5 0 0 1 24 0" fill="none" stroke={ring} strokeWidth={3} strokeLinecap="round" />
      </g>
      <circle cx={0} cy={0} r={13.5} fill={`url(#${body})`} stroke={OUTLINE} strokeWidth={2.4} />
      <path d="M-12.6 -4.5Q0 -0.5 12.8 -6.5M-11.5 5Q0 9.5 12 3" fill="none" stroke={GLOW.glow} strokeWidth={2} strokeLinecap="round" opacity={0.75} />
      <circle cx={-5} cy={-6} r={2.4} fill="#FFFFFF" opacity={0.9} />
      <g transform="rotate(-16)">
        <path d="M24 0A24 7.5 0 0 1 -24 0" fill="none" stroke={OUTLINE} strokeWidth={6.4} strokeLinecap="round" />
        <path d="M24 0A24 7.5 0 0 1 -24 0" fill="none" stroke={ring} strokeWidth={3} strokeLinecap="round" />
        <path d="M14 5.6A24 7.5 0 0 1 -6 7.3" fill="none" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" opacity={0.85} />
      </g>
      <circle cx={17} cy={-15} r={3.2} fill="#ECE6FF" stroke={OUTLINE} strokeWidth={1.7} />
      <path d={sparklePath(-19, -14, 3.6)} fill={GLOW.core} />
      <path d={sparklePath(19, 15, 2.8)} fill={GLOW.core} />
      <path d={sparklePath(-15, 19, 2)} fill={GLOW.light} />
    </g>
  );
}

export function LampItem({ id, p }: { id: string; p: string }) {
  switch (id) {
    case 'lamp-firefly':
      return <FireflyJar p={p} />;
    case 'lamp-flower':
      return <FlowerLamp p={p} />;
    case 'lamp-planet':
      return <PlanetLamp p={p} />;
    default:
      return null;
  }
}

/* ----------------------------------------------------------------- icons -- */

const ICON_HEAD: Record<string, string> = {
  'leaf-hat': 'translate(45.8 73.5) scale(1.5)',
  'star-hat': 'translate(46 77) scale(1.2)',
  'moon-crown': 'translate(48 74.5) scale(1.45)',
};

function EmptyIcon({ slot }: { slot: AccessorySlot }) {
  const common = {
    fill: 'rgba(197, 204, 230, 0.08)',
    stroke: UI.textMuted,
    strokeWidth: 2.6,
    strokeDasharray: '5 4.5',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    opacity: 0.8,
  };
  if (slot === 'head') {
    return (
      <g>
        <path d="M18 66C16 44 30 30 48 30C66 30 80 44 78 66C64 71 32 71 18 66Z" {...common} />
        <path d="M12 68C30 75 66 75 84 68" {...common} fill="none" />
      </g>
    );
  }
  if (slot === 'scarf') {
    return (
      <g>
        <path d="M20 36C20 24 76 24 76 36" {...common} fill="none" />
        <path d="M18 36Q48 46 78 36A7 7 0 0 1 78 50Q48 60 18 50A7 7 0 0 1 18 36Z" {...common} />
        <path d="M33 54L42 55L39 82Q32 85 26 81Z" {...common} />
        <path d="M44 55L52 54L58 76Q52 79 47 77Z" {...common} />
      </g>
    );
  }
  return (
    <g>
      <path d="M40 22C40 13 56 13 56 22" {...common} fill="none" />
      <path d="M36 26H60V32C68 36 70 44 70 52V64C70 72 64 76 56 76H40C32 76 26 72 26 64V52C26 44 28 36 36 32Z" {...common} />
    </g>
  );
}

function ScarfIcon({ id, p }: { id: string; p: string }) {
  const style = SCARVES[id];
  if (!style) return null;
  return (
    <g transform="translate(48 36) scale(1.12)">
      <path d="M-24 0C-24 -15 24 -15 24 0" fill="none" stroke={OUTLINE} strokeWidth={15.6} strokeLinecap="round" />
      <path d="M-24 0C-24 -15 24 -15 24 0" fill="none" stroke={style.tone.dark} strokeWidth={10.8} strokeLinecap="round" />
      <ScarfItem id={id} p={p} w={24} />
    </g>
  );
}

export function AccessoryIcon({ id, slot, title, className }: AccessoryIconProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const p = `la${uid}`;
  const def = id ? accessoryById(id) : undefined;
  const valid = def && def.slot === slot ? def.id : null;
  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <radialGradient id={`${p}-halo`}>
          <stop offset="0" stopColor={GLOW.core} stopOpacity={0.9} />
          <stop offset="0.3" stopColor={GLOW.light} stopOpacity={0.5} />
          <stop offset="1" stopColor={GLOW.glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      {!valid && <EmptyIcon slot={slot} />}
      {valid && slot === 'head' && (
        <g transform={ICON_HEAD[valid]}>
          <HeadItem id={valid} p={p} />
        </g>
      )}
      {valid && slot === 'scarf' && <ScarfIcon id={valid} p={p} />}
      {valid && slot === 'lamp' && (
        <g transform="translate(48 50) scale(1.4)">
          <LampItem id={valid} p={p} />
        </g>
      )}
    </svg>
  );
}
