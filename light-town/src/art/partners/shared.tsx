import type { ReactNode } from 'react';
import type { PartnerPose } from '../types';
import { THEME_LIGHTS } from '../palette';

/** Soft dark-navy outline shared by all partner art. */
export const OUTLINE = '#1F1B45';
/** Outline width at the 240 viewBox. */
export const SW = 2.6;
export const GLOW = THEME_LIGHTS.warm;
export const BLUSH = '#FF8FAB';
export const MOUTH = '#8E2F52';
export const TONGUE = '#FF8E99';
export const EYE_SHINE = '#4B4A93';

export interface Tone {
  main: string;
  light: string;
  dark: string;
}

/** Placement of an accessory: translate, then rotate (degrees), then scale. */
export interface Anchor {
  x: number;
  y: number;
  r?: number;
  s?: number;
}

export interface NeckAnchor extends Anchor {
  /** Half-width of the scarf band around this neck. */
  w: number;
}

/** Accessory anchors of one character in one pose. Head and neck anchors are in the
 * coordinates of the (tilted) head group / body group; the lamp is in viewBox units. */
export interface PoseRig {
  head: Anchor;
  neck: NeckAnchor;
  lamp: Anchor;
}

export type Rig = Record<PartnerPose, PoseRig>;

export interface CharacterProps {
  pose: PartnerPose;
  /** Unique prefix for ids and animation classes. */
  p: string;
  anim: boolean;
  headItem: ReactNode;
  neckItem: ReactNode;
}

export const num = (v: number): number => Math.round(v * 100) / 100;

/** Animation class name, or undefined when animation is off. */
export function ac(p: string, anim: boolean, name: string): string | undefined {
  return anim ? `${p}-${name}` : undefined;
}

export function anchorTransform(a: Anchor): string {
  let t = `translate(${num(a.x)} ${num(a.y)})`;
  if (a.r) t += ` rotate(${num(a.r)})`;
  if (a.s !== undefined && a.s !== 1) t += ` scale(${num(a.s)})`;
  return t;
}

/** Rounded rectangle as a path string (so it can be reused for clips and shading). */
export function rr(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.min(r, w / 2, h / 2);
  const x2 = x + w;
  const y2 = y + h;
  return (
    `M${num(x + q)} ${num(y)}H${num(x2 - q)}A${num(q)} ${num(q)} 0 0 1 ${num(x2)} ${num(y + q)}` +
    `V${num(y2 - q)}A${num(q)} ${num(q)} 0 0 1 ${num(x2 - q)} ${num(y2)}H${num(x + q)}` +
    `A${num(q)} ${num(q)} 0 0 1 ${num(x)} ${num(y2 - q)}V${num(y + q)}A${num(q)} ${num(q)} 0 0 1 ${num(x + q)} ${num(y)}Z`
  );
}

/** Capsule (rounded limb) of width w between two points. */
export function capsule(x1: number, y1: number, x2: number, y2: number, w: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (w / 2);
  const ny = (dx / len) * (w / 2);
  const r = num(w / 2);
  return (
    `M${num(x1 + nx)} ${num(y1 + ny)}L${num(x2 + nx)} ${num(y2 + ny)}` +
    `A${r} ${r} 0 0 0 ${num(x2 - nx)} ${num(y2 - ny)}L${num(x1 - nx)} ${num(y1 - ny)}` +
    `A${r} ${r} 0 0 0 ${num(x1 + nx)} ${num(y1 + ny)}Z`
  );
}

/** Five-point star with softly rounded tips. */
export function starPath(cx: number, cy: number, R: number, ri: number, rot = -90, round = 0.24): string {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 10; i += 1) {
    const a = ((rot + i * 36) * Math.PI) / 180;
    const rad = i % 2 === 0 ? R : ri;
    pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  const lerp = (a: [number, number], b: [number, number], t: number): string =>
    `${num(a[0] + (b[0] - a[0]) * t)} ${num(a[1] + (b[1] - a[1]) * t)}`;
  let d = '';
  for (let i = 0; i < 10; i += 2) {
    const o = pts[i];
    const prev = pts[(i + 9) % 10];
    const next = pts[i + 1];
    d += `${i === 0 ? 'M' : 'L'}${lerp(o, prev, round)}Q${num(o[0])} ${num(o[1])} ${lerp(o, next, round)}L${num(next[0])} ${num(next[1])}`;
  }
  return `${d}Z`;
}

/** Four-point twinkle. */
export function sparklePath(cx: number, cy: number, s: number): string {
  const k = s * 0.2;
  return (
    `M${num(cx)} ${num(cy - s)}Q${num(cx + k)} ${num(cy - k)} ${num(cx + s)} ${num(cy)}` +
    `Q${num(cx + k)} ${num(cy + k)} ${num(cx)} ${num(cy + s)}Q${num(cx - k)} ${num(cy + k)} ${num(cx - s)} ${num(cy)}` +
    `Q${num(cx - k)} ${num(cy - k)} ${num(cx)} ${num(cy - s)}Z`
  );
}

/** Heart centred on (cx, cy), roughly 2s wide. */
export function heartPath(cx: number, cy: number, s: number): string {
  const p = (x: number, y: number): string => `${num(cx + x * s)} ${num(cy + y * s)}`;
  return (
    `M${p(0, 0.95)}C${p(-0.55, 0.55)} ${p(-1.05, 0.15)} ${p(-1, -0.35)}` +
    `C${p(-0.95, -0.85)} ${p(-0.3, -1.05)} ${p(0, -0.55)}` +
    `C${p(0.3, -1.05)} ${p(0.95, -0.85)} ${p(1, -0.35)}` +
    `C${p(1.05, 0.15)} ${p(0.55, 0.55)} ${p(0, 0.95)}Z`
  );
}

interface ShadeProps {
  id: string;
  d: string;
  tone: Tone;
  /** Offset of the main tone; the uncovered strip shows the dark tone. */
  dx?: number;
  dy?: number;
  sw?: number;
  children?: ReactNode;
}

/** Flat-shaded shape: dark rim along the lower right, optional clipped details, soft outline. */
export function Shade({ id, d, tone, dx = -2.4, dy = -3.4, sw = SW, children }: ShadeProps) {
  return (
    <>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <path d={d} fill={tone.dark} />
        <path d={d} fill={tone.main} transform={`translate(${dx} ${dy})`} />
        {children}
      </g>
      <path d={d} fill="none" stroke={OUTLINE} strokeWidth={sw} strokeLinejoin="round" />
    </>
  );
}

interface SubToneProps {
  id: string;
  /** The parent shape. */
  d: string;
  /** Region of the parent shape that uses another tone. */
  region: string;
  tone: Tone;
  dx?: number;
  dy?: number;
}

/** Second colour region inside a Shade (keeps the same dark rim). */
export function SubTone({ id, d, region, tone, dx = -2.4, dy = -3.4 }: SubToneProps) {
  return (
    <>
      <clipPath id={id}>
        <path d={region} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <path d={d} fill={tone.dark} />
        <path d={d} fill={tone.main} transform={`translate(${dx} ${dy})`} />
      </g>
    </>
  );
}

export type EyeKind = 'open' | 'happy' | 'closed' | 'calm';

interface EyeProps {
  x: number;
  y: number;
  kind: EyeKind;
  rx?: number;
  ry?: number;
  /** Horizontal gaze offset. */
  look?: number;
  /** Skin colour used for the relaxed eyelid of 'calm' eyes. */
  lid?: string;
}

export function Eye({ x, y, kind, rx = 7, ry = 9, look = 0, lid = '#fff' }: EyeProps) {
  if (kind === 'closed') {
    return (
      <path
        d={`M${num(x - rx - 0.5)} ${num(y + 2.5)}Q${num(x)} ${num(y - ry)} ${num(x + rx + 0.5)} ${num(y + 2.5)}`}
        fill="none"
        stroke={OUTLINE}
        strokeWidth={3.4}
        strokeLinecap="round"
      />
    );
  }
  const cx = x + look;
  if (kind === 'happy') {
    const d =
      `M${num(cx - rx)} ${num(y + ry * 0.3)}C${num(cx - rx)} ${num(y - ry * 1.32)} ${num(cx + rx)} ${num(y - ry * 1.32)} ${num(cx + rx)} ${num(y + ry * 0.3)}` +
      `Q${num(cx)} ${num(y + ry * 0.02)} ${num(cx - rx)} ${num(y + ry * 0.3)}Z`;
    return (
      <g>
        <path d={d} fill={OUTLINE} stroke={OUTLINE} strokeWidth={1.4} strokeLinejoin="round" />
        <circle cx={num(cx + rx * 0.3)} cy={num(y - ry * 0.48)} r={num(rx * 0.36)} fill="#fff" />
        <circle cx={num(cx - rx * 0.36)} cy={num(y - ry * 0.05)} r={num(rx * 0.15)} fill="#fff" />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx={num(cx)} cy={y} rx={rx} ry={ry} fill={OUTLINE} />
      <ellipse cx={num(cx)} cy={num(y + ry * 0.52)} rx={num(rx * 0.58)} ry={num(ry * 0.26)} fill={EYE_SHINE} />
      {kind === 'calm' && (
        <>
          <path
            d={`M${num(cx - rx - 1.5)} ${num(y - ry * 0.5)}Q${num(cx)} ${num(y - ry * 1.15)} ${num(cx + rx + 1.5)} ${num(y - ry * 0.5)}V${num(y - ry - 3)}H${num(cx - rx - 1.5)}Z`}
            fill={lid}
          />
          <path
            d={`M${num(cx - rx - 0.8)} ${num(y - ry * 0.46)}Q${num(cx)} ${num(y - ry * 1.16)} ${num(cx + rx + 0.8)} ${num(y - ry * 0.46)}`}
            fill="none"
            stroke={OUTLINE}
            strokeWidth={2.1}
            strokeLinecap="round"
          />
        </>
      )}
      <circle
        cx={num(cx + rx * 0.3)}
        cy={num(kind === 'calm' ? y - ry * 0.3 : y - ry * 0.36)}
        r={num(rx * 0.42)}
        fill="#fff"
      />
      <circle cx={num(cx - rx * 0.34)} cy={num(y + ry * 0.3)} r={num(rx * 0.17)} fill="#fff" />
    </g>
  );
}

interface HaloProps {
  cx: number;
  cy: number;
  r: number;
  p: string;
  className?: string;
  opacity?: number;
  gradient?: string;
}

/** Soft radial glow (no filters). Uses the root gradient `${p}-halo` unless another is given. */
export function Halo({ cx, cy, r, p, className, opacity, gradient }: HaloProps) {
  return (
    <circle
      className={className}
      cx={num(cx)}
      cy={num(cy)}
      r={num(r)}
      fill={`url(#${gradient ?? `${p}-halo`})`}
      opacity={opacity}
    />
  );
}

interface SparkleProps {
  x: number;
  y: number;
  s: number;
  className?: string;
  color?: string;
}

/** Glowing twinkle: soft outer star with a bright core. */
export function Sparkle({ x, y, s, className, color = GLOW.light }: SparkleProps) {
  return (
    <g className={className}>
      <path d={sparklePath(x, y, s)} fill={color} />
      <path d={sparklePath(x, y, s * 0.5)} fill={GLOW.core} />
    </g>
  );
}

interface HeartProps {
  x: number;
  y: number;
  s: number;
  className?: string;
}

export function Heart({ x, y, s, className }: HeartProps) {
  return (
    <g className={className}>
      <path d={heartPath(x, y, s)} fill="#FF86A8" stroke={OUTLINE} strokeWidth={2.2} strokeLinejoin="round" />
      <ellipse cx={num(x - s * 0.45)} cy={num(y - s * 0.38)} rx={num(s * 0.22)} ry={num(s * 0.15)} fill="#FFD3E0" transform={`rotate(-30 ${num(x - s * 0.45)} ${num(y - s * 0.38)})`} />
    </g>
  );
}

/** Small pink pads on a raised paw seen from the front. */
export function PawPads({ x, y, s = 1, color = '#FFB0A8' }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g fill={color}>
      <ellipse cx={num(x)} cy={num(y + 1.6 * s)} rx={num(3.6 * s)} ry={num(3 * s)} />
      <circle cx={num(x - 4.2 * s)} cy={num(y - 3.2 * s)} r={num(1.7 * s)} />
      <circle cx={num(x)} cy={num(y - 4.6 * s)} r={num(1.7 * s)} />
      <circle cx={num(x + 4.2 * s)} cy={num(y - 3.2 * s)} r={num(1.7 * s)} />
    </g>
  );
}

export type SparkleSpot = readonly [x: number, y: number, size: number];

/** Twinkles around a celebrating partner; they pop once when animated and stay visible. */
export function CelebrateSparkles({ spots, p, anim }: { spots: readonly SparkleSpot[]; p: string; anim: boolean }) {
  return (
    <g>
      {spots.map(([x, y, s], i) => (
        <Sparkle key={`${x}-${y}`} x={x} y={y} s={s} className={ac(p, anim, `pop${i % 3}`)} />
      ))}
    </g>
  );
}
