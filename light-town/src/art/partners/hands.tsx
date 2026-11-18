import { useId } from 'react';
import type { HandsArtProps } from '../types';
import type { FingerId } from '../../config/keys';
import { ACCENT } from '../palette';
import { GLOW, OUTLINE, capsule, num, rr } from './shared';

const SKIN = { main: '#F8C8B5', light: '#FFE3D6', dark: '#E2A48E' };
const NAIL = '#FFEDE6';
const KEY = { side: '#AEB8E2', face: '#F1F3FF', label: '#2B305E', small: '#6A72A8', bump: '#8D98CB' };
const FONT = "Andika, 'Helvetica Neue', Arial, sans-serif";

const KEY_TOP = 46;
const KEY_W = 42;
const KEY_H = 48;

type HandFinger = 'little' | 'ring' | 'middle' | 'index' | 'thumb';

interface FingerGeo {
  /** Tip end centre and base end centre of the capsule, width. Left hand coordinates. */
  tx: number;
  ty: number;
  bx: number;
  by: number;
  w: number;
}

/** Left hand; the right hand is its mirror image around x = 240. */
const LEFT: Record<HandFinger, FingerGeo> = {
  little: { tx: 40, ty: 90, bx: 52, by: 158, w: 24 },
  ring: { tx: 84, ty: 85.5, bx: 88, by: 156, w: 27 },
  middle: { tx: 128, ty: 83, bx: 124, by: 154, w: 28.5 },
  index: { tx: 172, ty: 89, bx: 160, by: 158, w: 28 },
  thumb: { tx: 203, ty: 201, bx: 166, by: 181, w: 28 },
};

const FINGER_OF: Record<FingerId, { side: 'L' | 'R'; finger: HandFinger }> = {
  L5: { side: 'L', finger: 'little' },
  L4: { side: 'L', finger: 'ring' },
  L3: { side: 'L', finger: 'middle' },
  L2: { side: 'L', finger: 'index' },
  R2: { side: 'R', finger: 'index' },
  R3: { side: 'R', finger: 'middle' },
  R4: { side: 'R', finger: 'ring' },
  R5: { side: 'R', finger: 'little' },
  RT: { side: 'R', finger: 'thumb' },
};

const ORDER: HandFinger[] = ['little', 'ring', 'middle', 'index', 'thumb'];

const PALM =
  'M34 170C31 152 44 142 62 142C86 138 136 137 158 142C176 146 187 158 185 176C183 194 171 208 155 216L151 250H70L66 218C46 208 36 190 34 170Z';

const HOME_KEYS: ReadonlyArray<{ x: number; main: string; small: string | null; bump: boolean }> = [
  { x: 40, main: 'A', small: 'a', bump: false },
  { x: 84, main: 'S', small: 's', bump: false },
  { x: 128, main: 'D', small: 'd', bump: false },
  { x: 172, main: 'F', small: 'f', bump: true },
  { x: 308, main: 'J', small: 'j', bump: true },
  { x: 352, main: 'K', small: 'k', bump: false },
  { x: 396, main: 'L', small: 'l', bump: false },
  { x: 440, main: ';', small: null, bump: false },
];

/** Point at the very tip of a finger (beyond the tip end centre), in left-hand coordinates. */
function tipPoint(g: FingerGeo): [number, number] {
  const dx = g.tx - g.bx;
  const dy = g.ty - g.by;
  const len = Math.hypot(dx, dy) || 1;
  return [g.tx + (dx / len) * (g.w / 2), g.ty + (dy / len) * (g.w / 2)];
}

function Finger({ name, lit }: { name: HandFinger; lit: boolean }) {
  const g = LEFT[name];
  const angle = (Math.atan2(g.tx - g.bx, -(g.ty - g.by)) * 180) / Math.PI;
  const [px, py] = tipPoint(g);
  const nailW = g.w * 0.56;
  const crease = name === 'thumb' ? 0.5 : 0.56;
  const cx = g.tx + (g.bx - g.tx) * crease;
  const cy = g.ty + (g.by - g.ty) * crease;
  return (
    <g>
      <path
        d={capsule(g.tx, g.ty, g.bx, g.by, g.w)}
        fill={lit ? GLOW.light : SKIN.main}
        stroke={OUTLINE}
        strokeWidth={lit ? 4.4 : 2.6}
        strokeLinejoin="round"
      />
      <g transform={`rotate(${num(angle)} ${num(px)} ${num(py)})`}>
        <path
          d={rr(px - nailW / 2, py + 3.2, nailW, 12, nailW * 0.42)}
          fill={lit ? GLOW.core : NAIL}
          stroke={lit ? GLOW.glow : SKIN.dark}
          strokeWidth={1.4}
        />
      </g>
      <path
        d={`M${num(cx - g.w * 0.22)} ${num(cy)}Q${num(cx)} ${num(cy + 2.4)} ${num(cx + g.w * 0.22)} ${num(cy)}`}
        transform={`rotate(${num(angle)} ${num(cx)} ${num(cy)})`}
        fill="none"
        stroke={lit ? GLOW.glow : SKIN.dark}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </g>
  );
}

function Hand({ lit }: { lit: HandFinger | null }) {
  return (
    <g>
      {ORDER.filter((f) => f !== lit).map((f) => (
        <Finger key={f} name={f} lit={false} />
      ))}
      {lit && <Finger name={lit} lit />}
      <path d={PALM} fill={SKIN.main} stroke={OUTLINE} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M52 158C56 152 64 149 73 150" fill="none" stroke={SKIN.light} strokeWidth={4} strokeLinecap="round" />
      <path d="M112 196C126 200 140 196 150 186" fill="none" stroke={SKIN.dark} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <path d={rr(60, 227, 100, 36, 12)} fill={ACCENT.teal} stroke={OUTLINE} strokeWidth={2.6} />
      <path d={rr(60, 227, 100, 9, 4.5)} fill={ACCENT.tealDeep} stroke={OUTLINE} strokeWidth={2.2} />
    </g>
  );
}

function Keycap({ x, main, small, bump }: { x: number; main: string; small: string | null; bump: boolean }) {
  return (
    <g>
      <path d={rr(x - KEY_W / 2, KEY_TOP, KEY_W, KEY_H, 8)} fill={KEY.side} stroke={OUTLINE} strokeWidth={2.2} />
      <path d={rr(x - KEY_W / 2 + 3.5, KEY_TOP + 2.5, KEY_W - 7, KEY_H - 10, 6)} fill={KEY.face} />
      <text x={x + 2} y={KEY_TOP + 18.5} fontFamily={FONT} fontSize={15} fontWeight={700} fill={KEY.label} textAnchor="middle">
        {main}
      </text>
      {small && (
        <text x={x - 11.5} y={KEY_TOP + 11.5} fontFamily={FONT} fontSize={9.5} fontWeight={600} fill={KEY.small} textAnchor="middle">
          {small}
        </text>
      )}
      {bump && (
        <>
          <path d={rr(x - 6.5, KEY_TOP + 21.5, 13, 4, 2)} fill={KEY.bump} stroke={OUTLINE} strokeWidth={1.2} />
          <path d={`M${x - 4.5} ${KEY_TOP + 22.6}H${x + 3.5}`} stroke="#FFFFFF" strokeWidth={1} strokeLinecap="round" opacity={0.85} />
        </>
      )}
    </g>
  );
}

function SpaceBar() {
  return (
    <g>
      <path d={rr(176, 192, 128, 30, 9)} fill={KEY.side} stroke={OUTLINE} strokeWidth={2.2} />
      <path d={rr(180, 194.5, 120, 21, 7)} fill={KEY.face} />
    </g>
  );
}

function handsCss(p: string): string {
  return [
    `@keyframes ${p}-ring{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:0.7}}`,
    `.${p}-ring{transform-box:fill-box;transform-origin:50% 50%;animation:${p}-ring 2s ease-in-out infinite}`,
    `@keyframes ${p}-arrow{0%,100%{transform:translateY(0)}50%{transform:translateY(4px)}}`,
    `.${p}-arrow{animation:${p}-arrow 2s ease-in-out infinite}`,
    `@keyframes ${p}-halo{0%,100%{opacity:1}50%{opacity:0.6}}`,
    `.${p}-halo{animation:${p}-halo 2.4s ease-in-out infinite}`,
  ].join('\n');
}

export function HandsArt({ finger, emphasis, showHomeKeys = false, animate, title, className }: HandsArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const p = `lh${uid}`;
  const target = finger ? FINGER_OF[finger] : undefined;
  const litLeft = target?.side === 'L' ? target.finger : null;
  const litRight = target?.side === 'R' ? target.finger : null;
  let marker: { x: number; y: number; thumb: boolean } | null = null;
  if (target) {
    const [lx, ly] = tipPoint(LEFT[target.finger]);
    const x = target.side === 'L' ? lx : 480 - lx;
    marker = target.finger === 'thumb' ? { x, y: ly - 6, thumb: true } : { x, y: KEY_TOP + KEY_H / 2 - 2, thumb: false };
  }
  const anim = animate && emphasis;
  return (
    <svg viewBox="0 0 480 240" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      {animate && <style>{handsCss(p)}</style>}
      <defs>
        <radialGradient id={`${p}-glow`}>
          <stop offset="0" stopColor={GLOW.core} stopOpacity={0.9} />
          <stop offset="0.4" stopColor={GLOW.light} stopOpacity={0.45} />
          <stop offset="1" stopColor={GLOW.glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      {marker && (
        <circle
          className={animate ? `${p}-halo` : undefined}
          cx={num(marker.x)}
          cy={num(marker.thumb ? marker.y : marker.y + 8)}
          r={marker.thumb ? 42 : 50}
          fill={`url(#${p}-glow)`}
        />
      )}
      {showHomeKeys && (
        <g>
          {HOME_KEYS.map((k) => (
            <Keycap key={k.main} {...k} />
          ))}
          <SpaceBar />
        </g>
      )}
      <Hand lit={litLeft} />
      <g transform="translate(480 0) scale(-1 1)">
        <Hand lit={litRight} />
      </g>
      {marker && (
        <g>
          <g className={anim ? `${p}-ring` : undefined}>
            <ellipse
              cx={num(marker.x)}
              cy={num(marker.y)}
              rx={marker.thumb ? (emphasis ? 30 : 25) : emphasis ? 31 : 27}
              ry={marker.thumb ? (emphasis ? 25 : 21) : emphasis ? 37 : 32}
              fill="none"
              stroke={OUTLINE}
              strokeWidth={emphasis ? 8 : 6}
            />
            <ellipse
              cx={num(marker.x)}
              cy={num(marker.y)}
              rx={marker.thumb ? (emphasis ? 30 : 25) : emphasis ? 31 : 27}
              ry={marker.thumb ? (emphasis ? 25 : 21) : emphasis ? 37 : 32}
              fill="none"
              stroke={GLOW.core}
              strokeWidth={emphasis ? 4.2 : 3}
              strokeDasharray={emphasis ? undefined : '9 5'}
            />
          </g>
          {emphasis && (
            <g className={anim ? `${p}-arrow` : undefined}>
              <path
                d={arrowPath(marker.x, marker.thumb ? marker.y - 28 : marker.y - 39)}
                fill={GLOW.light}
                stroke={OUTLINE}
                strokeWidth={2.6}
                strokeLinejoin="round"
              />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}

/** Down-pointing arrow (24 tall) whose tip touches (x, tipY). */
function arrowPath(x: number, tipY: number): string {
  const t = num(tipY);
  return (
    `M${num(x)} ${t}L${num(x - 11)} ${num(t - 11)}H${num(x - 5)}V${num(t - 21)}` +
    `Q${num(x - 5)} ${num(t - 24)} ${num(x - 2)} ${num(t - 24)}H${num(x + 2)}Q${num(x + 5)} ${num(t - 24)} ${num(x + 5)} ${num(t - 21)}` +
    `V${num(t - 11)}H${num(x + 11)}Z`
  );
}
