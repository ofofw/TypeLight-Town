import type { PartnerPose } from '../types';
import {
  BLUSH,
  CelebrateSparkles,
  Eye,
  GLOW,
  Halo,
  Heart,
  MOUTH,
  OUTLINE,
  PawPads,
  SW,
  Shade,
  TONGUE,
  ac,
  anchorTransform,
  capsule,
  rr,
  starPath,
} from './shared';
import type { CharacterProps, EyeKind, Rig, SparkleSpot, Tone } from './shared';

const FUR: Tone = { main: '#B8A5F3', light: '#DACFFF', dark: '#8F7AD8' };
const WHITE: Tone = { main: '#FFFFFF', light: '#FFFFFF', dark: '#E2D9F7' };
const EAR_IN = '#FFC4DE';
const NOSE = '#FF8DB5';

export const RABBIT_RIG: Rig = {
  idle: { head: { x: 120, y: 79, s: 0.8 }, neck: { x: 120, y: 151, w: 29 }, lamp: { x: 198, y: 92 } },
  encourage: { head: { x: 120, y: 79, s: 0.8 }, neck: { x: 120, y: 151, w: 29 }, lamp: { x: 204, y: 72 } },
  celebrate: { head: { x: 120, y: 79, s: 0.8 }, neck: { x: 120, y: 151, w: 29 }, lamp: { x: 204, y: 86 } },
  guide: { head: { x: 120, y: 79, s: 0.8 }, neck: { x: 120, y: 151, w: 29 }, lamp: { x: 205, y: 80 } },
};

const HEAD_D = 'M105 76H135C156 76 166 88 166 108V116C166 136 153 148 132 148H108C87 148 74 136 74 116V108C74 88 84 76 105 76Z';
const EAR_D = 'M-10 6C-12 -14 -10 -34 -6 -46C-4 -51 4 -51 6 -46C10 -34 12 -14 10 6Z';
const EAR_IN_D = 'M-5 2C-6.5 -12 -5.5 -28 -3 -38C-2 -41 2 -41 3 -38C5.5 -28 6.5 -12 5 2Z';
const BODY_D = rr(86, 142, 68, 72, 25);
const STAR_Y = -56;
const SPARKLES: readonly SparkleSpot[] = [
  [40, 74, 8],
  [204, 38, 6.5],
  [214, 162, 7.5],
  [24, 186, 6],
  [36, 128, 5],
];

/** Ear angles (left, right) per pose. */
const EARS: Record<PartnerPose, readonly [number, number]> = {
  idle: [-10, 5],
  encourage: [-6, 14],
  celebrate: [-19, 19],
  guide: [-2, 16],
};

function Ear({ x, angle, p, anim, big, second }: { x: number; angle: number; p: string; anim: boolean; big: boolean; second: boolean }) {
  const R = big ? 13 : 11.5;
  return (
    <g transform={`translate(${x} 84) rotate(${angle})`}>
      <Halo cx={0} cy={STAR_Y} r={big ? 27 : 22} p={p} className={ac(p, anim, second ? 'glow2' : 'glow')} />
      <path d={EAR_D} fill={FUR.main} stroke={OUTLINE} strokeWidth={SW} strokeLinejoin="round" />
      <path d={EAR_IN_D} fill={EAR_IN} />
      <path d="M-7.5 -8C-8.5 -20 -7.5 -32 -4.5 -42" fill="none" stroke={FUR.light} strokeWidth={2.2} strokeLinecap="round" opacity={0.8} />
      <g className={ac(p, anim, second ? 'twinkle2' : 'twinkle')}>
        <path d={starPath(0, STAR_Y, R, R * 0.5)} fill={GLOW.light} stroke={OUTLINE} strokeWidth={2.3} strokeLinejoin="round" />
        <path d={starPath(-1, STAR_Y - 0.5, R * 0.48, R * 0.25)} fill={GLOW.core} />
      </g>
    </g>
  );
}

interface ArmProps {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  pads?: boolean;
  open?: boolean;
}

function Arm({ sx, sy, ex, ey, pads = false, open = false }: ArmProps) {
  return (
    <g>
      <path d={capsule(sx, sy, ex, ey, 15)} fill={FUR.main} stroke={OUTLINE} strokeWidth={SW} strokeLinejoin="round" />
      {open ? (
        <ellipse cx={ex} cy={ey} rx={10.5} ry={8.2} fill={WHITE.main} stroke={OUTLINE} strokeWidth={SW} />
      ) : (
        <circle cx={ex} cy={ey} r={pads ? 9.4 : 8.4} fill={WHITE.main} stroke={OUTLINE} strokeWidth={SW} />
      )}
      {pads && <PawPads x={ex} y={ey} s={0.92} color="#FFB6D0" />}
    </g>
  );
}

function Mouth({ pose }: { pose: PartnerPose }) {
  if (pose === 'idle') {
    return (
      <path
        d="M120 124.5V127.5M114 127Q117 131 120 127.5Q123 131 126 127"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  const big = pose === 'celebrate';
  const w = big ? 9.5 : 7;
  const h = big ? 13 : 9.5;
  return (
    <g>
      <path
        d={`M${120 - w} 126.5Q120 129 ${120 + w} 126.5Q${120 + w * 0.9} ${126.5 + h} 120 ${126.5 + h}Q${120 - w * 0.9} ${126.5 + h} ${120 - w} 126.5Z`}
        fill={MOUTH}
        stroke={OUTLINE}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <ellipse cx={120} cy={126.5 + h * 0.72} rx={w * 0.5} ry={h * 0.22} fill={TONGUE} />
    </g>
  );
}

function Head({ pose, p, anim }: { pose: PartnerPose; p: string; anim: boolean }) {
  const eyes: EyeKind = pose === 'celebrate' ? 'closed' : pose === 'encourage' ? 'happy' : 'open';
  const look = pose === 'guide' ? 2.6 : 0;
  const blink = pose === 'idle' || pose === 'guide' ? ac(p, anim, 'blink') : undefined;
  const [la, ra] = EARS[pose];
  const big = pose === 'celebrate';
  return (
    <g>
      <Ear x={101} angle={la} p={p} anim={anim} big={big} second={false} />
      <Ear x={139} angle={ra} p={p} anim={anim} big={big} second />
      <Shade id={`${p}-rbh`} d={HEAD_D} tone={FUR}>
        <ellipse cx={97} cy={86} rx={14} ry={5} fill={FUR.light} transform="rotate(-10 97 86)" />
        <ellipse cx={110} cy={129} rx={12.5} ry={10} fill={WHITE.main} />
        <ellipse cx={130} cy={129} rx={12.5} ry={10} fill={WHITE.main} />
      </Shade>
      <ellipse cx={87} cy={125} rx={7.4} ry={4.6} fill={BLUSH} opacity={0.62} />
      <ellipse cx={153} cy={125} rx={7.4} ry={4.6} fill={BLUSH} opacity={0.62} />
      <g className={blink}>
        <Eye x={99} y={108} kind={eyes} rx={7.4} ry={9.6} look={look} />
        <Eye x={141} y={108} kind={eyes} rx={7.4} ry={9.6} look={look} />
      </g>
      <path d="M115.2 119Q120 117 124.8 119Q123.8 123.6 120 125Q116.2 123.6 115.2 119Z" fill={NOSE} stroke={OUTLINE} strokeWidth={1.8} strokeLinejoin="round" />
      <Mouth pose={pose} />
    </g>
  );
}

function Body({ p }: { p: string }) {
  return (
    <>
      <Shade id={`${p}-rbb`} d={BODY_D} tone={FUR}>
        <ellipse cx={120} cy={186} rx={19} ry={22} fill={WHITE.main} />
        <ellipse cx={100} cy={156} rx={5.5} ry={8} fill={FUR.light} opacity={0.8} />
      </Shade>
      {[84, 124].map((x) => (
        <g key={x}>
          <path d={rr(x, 200, 32, 17, 8.5)} fill={WHITE.main} stroke={OUTLINE} strokeWidth={SW} />
          <path d={`M${x + 12} 210.5V214M${x + 20} 210.5V214`} stroke={WHITE.dark} strokeWidth={2} strokeLinecap="round" />
        </g>
      ))}
    </>
  );
}

export function RabbitArt({ pose, p, anim, headItem, neckItem }: CharacterProps) {
  const rig = RABBIT_RIG[pose];
  const tilt = pose === 'encourage' ? 4 : pose === 'guide' ? 5 : 0;
  return (
    <g transform={pose === 'guide' ? 'rotate(3 120 214)' : undefined}>
      {pose === 'encourage' && <Arm sx={146} sy={160} ex={179} ey={131} pads />}
      {pose === 'celebrate' && (
        <>
          <Arm sx={98} sy={160} ex={64} ey={125} pads />
          <Arm sx={142} sy={160} ex={176} ey={125} pads />
        </>
      )}
      {pose === 'guide' && (
        <g className={ac(p, anim, 'point')}>
          <Arm sx={144} sy={163} ex={186} ey={155} open />
        </g>
      )}
      <Body p={p} />
      {neckItem && <g transform={anchorTransform(rig.neck)}>{neckItem}</g>}
      {(pose === 'idle' || pose === 'encourage' || pose === 'guide') && <Arm sx={98} sy={160} ex={105} ey={185} />}
      {pose === 'idle' && <Arm sx={142} sy={160} ex={135} ey={185} />}
      <g transform={tilt ? `rotate(${tilt} 120 146)` : undefined}>
        <g className={pose === 'encourage' ? ac(p, anim, 'nod') : undefined}>
          <Head pose={pose} p={p} anim={anim} />
          {headItem && <g transform={anchorTransform(rig.head)}>{headItem}</g>}
        </g>
      </g>
      {pose === 'encourage' && <Heart x={194} y={112} s={8.5} className={ac(p, anim, 'heart')} />}
      {pose === 'celebrate' && <CelebrateSparkles spots={SPARKLES} p={p} anim={anim} />}
    </g>
  );
}
