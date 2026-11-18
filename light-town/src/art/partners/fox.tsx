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
  SubTone,
  TONGUE,
  ac,
  anchorTransform,
  capsule,
  rr,
} from './shared';
import type { CharacterProps, EyeKind, Rig, SparkleSpot, Tone } from './shared';

const FUR: Tone = { main: '#F79A3E', light: '#FFC27A', dark: '#D8722B' };
const CREAM: Tone = { main: '#FFF2E0', light: '#FFFFFF', dark: '#EDCFAE' };
const SOCK: Tone = { main: '#7B4733', light: '#9C654C', dark: '#5E3424' };
const EAR_IN = '#FFCFB3';

export const FOX_RIG: Rig = {
  idle: { head: { x: 120, y: 71 }, neck: { x: 120, y: 148, w: 32 }, lamp: { x: 198, y: 92 } },
  encourage: { head: { x: 120, y: 71 }, neck: { x: 120, y: 148, w: 32 }, lamp: { x: 204, y: 72 } },
  celebrate: { head: { x: 120, y: 71 }, neck: { x: 120, y: 148, w: 32 }, lamp: { x: 204, y: 86 } },
  guide: { head: { x: 120, y: 71 }, neck: { x: 120, y: 148, w: 32 }, lamp: { x: 205, y: 78 } },
};

const HEAD = 'M100 68H140C158 68 168 77 168 95V113C168 132 154 144 134 144H106C86 144 72 132 72 113V95C72 77 82 68 100 68Z';
const EAR = 'M75 98C72 80 73 63 78 53C81 47 87 46 91 49C99 55 106 62 112 71Z';
const EAR_INNER = 'M82 86C81 75 82 64 85 58C87 55 89 55 91 57C95 61 100 66 104 72Z';
const EAR_TIP = 'M60 68L104 53V30H60Z';
const CHEEK_TUFT = 'M76 116C71 119 67.5 123 66 128C68.6 127.8 70.6 128.6 72 130C71.4 132.6 72.6 135 76 137Z';
const MASK = 'M60 152V119C70 107 90 104 104 112C110 116 115 118 120 118C125 118 130 116 136 112C150 104 170 107 180 119V152Z';
const FLAME = 'M120 75C123.6 79.6 125.6 83.2 124.1 86.6C123 89 117 89 115.9 86.6C114.4 83.2 116.4 79.6 120 75Z';
const BODY = rr(84, 138, 72, 76, 26);
const TAIL =
  'M106 207C86 217 52 213 40 194C30 177 32 154 42 140C46 134 51 130 56 129C62 129 66 133 65 139C64 143 62 147 60 152C56 164 58 178 70 186C79 192 94 194 106 191Z';
const TAIL_TIP = 'M20 150C36 142 54 142 74 151V100H20Z';
const LANTERN = { x: 53, y: 115 };
const SPARKLES: readonly SparkleSpot[] = [
  [42, 62, 8],
  [182, 34, 7],
  [212, 162, 7.5],
  [22, 192, 6],
  [64, 26, 5],
];

function Lantern({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={11} ry={10.5} fill={GLOW.light} stroke={OUTLINE} strokeWidth={2.4} />
      <path
        d={`M${x - 4} ${y - 9.5}Q${x - 9} ${y} ${x - 4} ${y + 9.5}M${x + 4} ${y - 9.5}Q${x + 9} ${y} ${x + 4} ${y + 9.5}`}
        fill="none"
        stroke={GLOW.glow}
        strokeWidth={1.6}
      />
      <ellipse cx={x - 2.6} cy={y - 2.6} rx={4.2} ry={3.6} fill={GLOW.core} />
      <rect x={x - 7.5} y={y - 14} width={15} height={5.5} rx={2.6} fill={SOCK.main} stroke={OUTLINE} strokeWidth={2.2} />
      <rect x={x - 3} y={y - 17.5} width={6} height={4} rx={2} fill={SOCK.main} stroke={OUTLINE} strokeWidth={2} />
      <rect x={x - 6.5} y={y + 8.5} width={13} height={5} rx={2.5} fill={SOCK.main} stroke={OUTLINE} strokeWidth={2.2} />
    </g>
  );
}

function Tail({ pose, p, anim }: { pose: PartnerPose; p: string; anim: boolean }) {
  const rot = pose === 'celebrate' ? -16 : pose === 'guide' ? -5 : 0;
  const big = pose === 'celebrate';
  return (
    <g transform={rot ? `rotate(${rot} 102 202)` : undefined}>
      <Halo cx={LANTERN.x} cy={LANTERN.y} r={big ? 40 : 34} p={p} className={ac(p, anim, 'glow')} />
      <Shade id={`${p}-fxt`} d={TAIL} tone={FUR}>
        <SubTone id={`${p}-fxtt`} d={TAIL} region={TAIL_TIP} tone={CREAM} />
        <path d="M40 172C40 162 43 154 47 148" fill="none" stroke={FUR.light} strokeWidth={4} strokeLinecap="round" />
      </Shade>
      <Lantern x={LANTERN.x} y={LANTERN.y} />
    </g>
  );
}

interface ArmProps {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  pads?: boolean;
  /** Paw drawn as a wider oval (open paw gesturing sideways). */
  open?: boolean;
}

function Arm({ sx, sy, ex, ey, pads = false, open = false }: ArmProps) {
  return (
    <g>
      <path d={capsule(sx, sy, ex, ey, 16)} fill={FUR.main} stroke={OUTLINE} strokeWidth={SW} strokeLinejoin="round" />
      {open ? (
        <ellipse cx={ex} cy={ey} rx={11} ry={8.6} fill={SOCK.main} stroke={OUTLINE} strokeWidth={SW} />
      ) : (
        <circle cx={ex} cy={ey} r={pads ? 9.6 : 8.6} fill={SOCK.main} stroke={OUTLINE} strokeWidth={SW} />
      )}
      {pads && <PawPads x={ex} y={ey} s={0.95} />}
      {!pads && <ellipse cx={ex - 2.4} cy={ey - 3} rx={3} ry={2} fill={SOCK.light} />}
    </g>
  );
}

function Mouth({ pose }: { pose: PartnerPose }) {
  if (pose === 'idle') {
    return (
      <path
        d="M120 120.5V123.5M112.5 123Q116 127.2 120 123.5Q124 127.2 127.5 123"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  const big = pose === 'celebrate';
  const w = big ? 10 : 7.5;
  const h = big ? 14 : 10;
  return (
    <g>
      <path
        d={`M${120 - w} 122.5Q120 125 ${120 + w} 122.5Q${120 + w * 0.9} ${122.5 + h} 120 ${122.5 + h}Q${120 - w * 0.9} ${122.5 + h} ${120 - w} 122.5Z`}
        fill={MOUTH}
        stroke={OUTLINE}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <ellipse cx={120} cy={122.5 + h * 0.72} rx={w * 0.5} ry={h * 0.22} fill={TONGUE} />
    </g>
  );
}

function Head({ pose, p, anim }: { pose: PartnerPose; p: string; anim: boolean }) {
  const eyes: EyeKind = pose === 'celebrate' ? 'closed' : pose === 'encourage' ? 'happy' : 'open';
  const look = pose === 'guide' ? 2.6 : 0;
  const blink = pose === 'idle' || pose === 'guide' ? ac(p, anim, 'blink') : undefined;
  return (
    <g>
      <clipPath id={`${p}-fxe`}>
        <path d={EAR} />
      </clipPath>
      {[false, true].map((mirror) => (
        <g key={mirror ? 'r' : 'l'} transform={mirror ? 'translate(240 0) scale(-1 1)' : undefined}>
          <path d={CHEEK_TUFT} fill={CREAM.main} stroke={OUTLINE} strokeWidth={SW} strokeLinejoin="round" />
          <path d={EAR} fill={FUR.main} />
          <g clipPath={`url(#${p}-fxe)`}>
            <path d={EAR_TIP} fill={SOCK.main} />
          </g>
          <path d={EAR_INNER} fill={EAR_IN} />
          <path d={EAR} fill="none" stroke={OUTLINE} strokeWidth={SW} strokeLinejoin="round" />
        </g>
      ))}
      <Shade id={`${p}-fxh`} d={HEAD} tone={FUR}>
        <ellipse cx={96} cy={79} rx={15} ry={5.5} fill={FUR.light} transform="rotate(-10 96 79)" />
        <SubTone id={`${p}-fxm`} d={HEAD} region={MASK} tone={CREAM} />
        <path d={FLAME} fill={CREAM.main} />
      </Shade>
      <ellipse cx={87} cy={121} rx={7.5} ry={4.6} fill={BLUSH} opacity={0.6} />
      <ellipse cx={153} cy={121} rx={7.5} ry={4.6} fill={BLUSH} opacity={0.6} />
      <g className={blink}>
        <Eye x={101} y={102} kind={eyes} look={look} />
        <Eye x={139} y={102} kind={eyes} look={look} />
      </g>
      <path d="M114.5 114.5Q120 112.5 125.5 114.5Q124.5 119.5 120 121Q115.5 119.5 114.5 114.5Z" fill={OUTLINE} />
      <ellipse cx={118.4} cy={115.1} rx={1.7} ry={1} fill="#6E6AA8" />
      <Mouth pose={pose} />
    </g>
  );
}

function Body({ p }: { p: string }) {
  return (
    <>
      <Shade id={`${p}-fxb`} d={BODY} tone={FUR}>
        <ellipse cx={120} cy={184} rx={21} ry={24} fill={CREAM.main} />
        <ellipse cx={97} cy={153} rx={5.5} ry={8} fill={FUR.light} opacity={0.8} />
      </Shade>
      {[88, 125].map((x) => (
        <g key={x}>
          <path d={rr(x, 200, 27, 16.5, 8.2)} fill={SOCK.main} stroke={OUTLINE} strokeWidth={SW} />
          <path d={`M${x + 9.5} 209.5V213.5M${x + 17.5} 209.5V213.5`} stroke={SOCK.dark} strokeWidth={2} strokeLinecap="round" />
          <ellipse cx={x + 8} cy={204.5} rx={4.5} ry={1.8} fill={SOCK.light} />
        </g>
      ))}
    </>
  );
}

export function FoxArt({ pose, p, anim, headItem, neckItem }: CharacterProps) {
  const rig = FOX_RIG[pose];
  const tilt = pose === 'encourage' ? 4 : pose === 'guide' ? 5 : 0;
  return (
    <g transform={pose === 'guide' ? 'rotate(3 120 214)' : undefined}>
      <Tail pose={pose} p={p} anim={anim} />
      {pose === 'encourage' && <Arm sx={146} sy={156} ex={180} ey={128} pads />}
      {pose === 'celebrate' && (
        <>
          <Arm sx={98} sy={156} ex={64} ey={122} pads />
          <Arm sx={142} sy={156} ex={176} ey={122} pads />
        </>
      )}
      {pose === 'guide' && (
        <g className={ac(p, anim, 'point')}>
          <Arm sx={144} sy={160} ex={187} ey={152} open />
        </g>
      )}
      <Body p={p} />
      {neckItem && <g transform={anchorTransform(rig.neck)}>{neckItem}</g>}
      {(pose === 'idle' || pose === 'encourage' || pose === 'guide') && <Arm sx={96} sy={157} ex={104} ey={184} />}
      {pose === 'idle' && <Arm sx={144} sy={157} ex={136} ey={184} />}
      <g transform={tilt ? `rotate(${tilt} 120 142)` : undefined}>
        <g className={pose === 'encourage' ? ac(p, anim, 'nod') : undefined}>
          <Head pose={pose} p={p} anim={anim} />
          {headItem && <g transform={anchorTransform(rig.head)}>{headItem}</g>}
        </g>
      </g>
      {pose === 'encourage' && <Heart x={194} y={110} s={8.5} className={ac(p, anim, 'heart')} />}
      {pose === 'celebrate' && <CelebrateSparkles spots={SPARKLES} p={p} anim={anim} />}
    </g>
  );
}
