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

const SHELL: Tone = { main: '#3CC9B4', light: '#8EEBD9', dark: '#22907F' };
const PLATE = '#62DCC7';
const RIM: Tone = { main: '#2AA893', light: '#5ED2BE', dark: '#1C7A6B' };
const SKIN: Tone = { main: '#A5DA78', light: '#CDEFA6', dark: '#75B457' };
const MUZZLE: Tone = { main: '#E4F6C6', light: '#F7FFE8', dark: '#C5E3A0' };
const NAIL = '#FFF5D8';
const BRASS: Tone = { main: '#E3A94F', light: '#F8D08A', dark: '#B07A2C' };

/** The head is drawn at y 64–138 and shifted down by HEAD_DY inside its group. */
const HEAD_DY = 8;

export const TURTLE_RIG: Rig = {
  idle: { head: { x: 120, y: 67, s: 0.95 }, neck: { x: 120, y: 154, w: 26 }, lamp: { x: 198, y: 90 } },
  encourage: { head: { x: 120, y: 67, s: 0.95 }, neck: { x: 120, y: 154, w: 26 }, lamp: { x: 204, y: 72 } },
  celebrate: { head: { x: 120, y: 67, s: 0.95 }, neck: { x: 120, y: 154, w: 26 }, lamp: { x: 204, y: 84 } },
  guide: { head: { x: 120, y: 67, s: 0.95 }, neck: { x: 120, y: 154, w: 26 }, lamp: { x: 205, y: 78 } },
};

const SHELL_D = 'M44 193C42 142 76 106 120 106C164 106 198 142 196 193C170 200 70 200 44 193Z';
const RIM_D = 'M39 185C70 195 170 195 201 185C205 191 205 198 200 202C170 211 70 211 40 202C35 198 35 191 39 185Z';
const HEAD_D = 'M100 64H140C156 64 164 74 164 90V108C164 126 151 138 134 138H106C89 138 76 126 76 108V90C76 74 84 64 100 64Z';
const MUZZLE_REGION = 'M66 150V119C82 106 158 106 174 119V150Z';
const NECK_D = rr(98, 130, 44, 70, 18);
const LAMP = { x: 57, y: 113 };
const SPARKLES: readonly SparkleSpot[] = [
  [30, 66, 7.5],
  [178, 40, 7],
  [214, 162, 7.5],
  [20, 178, 6],
  [82, 38, 5],
];

/** Soft tiles on the shell: centre x, centre y, width, height, rotation. */
const TILES: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [98, 124, 22, 18, -6],
  [120, 121, 22, 18, 0],
  [142, 124, 22, 18, 6],
  [67, 151, 21, 20, -28],
  [91, 145, 23, 20, -12],
  [149, 145, 23, 20, 12],
  [173, 151, 21, 20, 28],
  [55, 177, 19, 17, -18],
  [79, 172, 22, 19, -7],
  [104, 170, 22, 19, -2],
  [136, 170, 22, 19, 2],
  [161, 172, 22, 19, 7],
  [185, 177, 19, 17, 18],
];

const RIM_LINES = [58, 80, 104, 136, 160, 182];

function ShellLamp({ p, anim, big }: { p: string; anim: boolean; big: boolean }) {
  const { x, y } = LAMP;
  return (
    <g>
      <Halo cx={x} cy={y} r={big ? 42 : 35} p={p} className={ac(p, anim, 'glow')} />
      <path d={capsule(72, 140, x + 4, y + 13, 6.5)} fill={BRASS.main} stroke={OUTLINE} strokeWidth={2.2} />
      <path
        d={`M${x - 11} ${y + 6}Q${x} ${y + 21} ${x + 11} ${y + 6}`}
        fill="none"
        stroke={OUTLINE}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <path
        d={`M${x - 11} ${y + 6}Q${x} ${y + 21} ${x + 11} ${y + 6}`}
        fill="none"
        stroke={BRASS.main}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <circle cx={x} cy={y} r={12.5} fill={GLOW.light} stroke={OUTLINE} strokeWidth={2.4} />
      <path d={`M${x + 9.6} ${y - 4}A10.4 10.4 0 0 1 ${x - 3} ${y + 10}`} fill="none" stroke={GLOW.glow} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={x - 3.4} cy={y - 3.6} r={5} fill={GLOW.core} />
      <circle cx={x - 5} cy={y - 5.4} r={1.8} fill="#fff" />
      <path d={rr(x - 5, y - 16.5, 10, 5.5, 2.6)} fill={BRASS.main} stroke={OUTLINE} strokeWidth={2} />
      <circle cx={x} cy={y - 18.5} r={2.2} fill={BRASS.light} stroke={OUTLINE} strokeWidth={1.6} />
    </g>
  );
}

function Shell({ p }: { p: string }) {
  return (
    <>
      <Shade id={`${p}-tts`} d={SHELL_D} tone={SHELL} dx={-3} dy={-4}>
        {TILES.map(([cx, cy, w, h, r]) => (
          <g key={`${cx}-${cy}`} transform={`rotate(${r} ${cx} ${cy})`}>
            <path d={rr(cx - w / 2 + 1.4, cy - h / 2 + 2, w, h, 6)} fill={SHELL.dark} opacity={0.55} />
            <path d={rr(cx - w / 2, cy - h / 2, w, h, 6)} fill={PLATE} />
            <path d={rr(cx - w / 2 + 3, cy - h / 2 + 2.5, w * 0.45, 3.4, 1.7)} fill={SHELL.light} opacity={0.9} />
          </g>
        ))}
      </Shade>
    </>
  );
}

function Rim({ p }: { p: string }) {
  return (
    <Shade id={`${p}-ttr`} d={RIM_D} tone={RIM} dx={0} dy={-3}>
      {RIM_LINES.map((x) => {
        const top = 185 + 10 * (1 - Math.abs(x - 120) / 81) - 1;
        return <path key={x} d={`M${x} ${top}V${top + 18}`} stroke={RIM.dark} strokeWidth={2.2} strokeLinecap="round" />;
      })}
      <path d="M48 189C80 197 160 197 192 189" fill="none" stroke={RIM.light} strokeWidth={2} strokeLinecap="round" opacity={0.8} />
    </Shade>
  );
}

function Nails({ x, y, dir = 1 }: { x: number; y: number; dir?: 1 | -1 }) {
  return (
    <g fill={NAIL} stroke={OUTLINE} strokeWidth={1.3}>
      <ellipse cx={x - 7} cy={y - dir * 0.6} rx={3} ry={2.3} />
      <ellipse cx={x} cy={y} rx={3} ry={2.3} />
      <ellipse cx={x + 7} cy={y - dir * 0.6} rx={3} ry={2.3} />
    </g>
  );
}

function StandingLeg({ x }: { x: number }) {
  return (
    <g>
      <path d={rr(x, 181, 30, 36, 13)} fill={SKIN.main} stroke={OUTLINE} strokeWidth={SW} />
      <path d={rr(x + 4, 185, 9, 18, 4.5)} fill={SKIN.light} opacity={0.75} />
      <Nails x={x + 15} y={213} />
    </g>
  );
}

function RaisedLeg({ sx, sy, ex, ey, open = false }: { sx: number; sy: number; ex: number; ey: number; open?: boolean }) {
  return (
    <g>
      <path d={capsule(sx, sy, ex, ey, 27)} fill={SKIN.main} stroke={OUTLINE} strokeWidth={SW} strokeLinejoin="round" />
      {open ? (
        <ellipse cx={ex} cy={ey} rx={15} ry={12.5} fill={SKIN.main} stroke={OUTLINE} strokeWidth={SW} />
      ) : (
        <circle cx={ex} cy={ey} r={14} fill={SKIN.main} stroke={OUTLINE} strokeWidth={SW} />
      )}
      <ellipse cx={ex - 3.5} cy={ey + 2} rx={5} ry={4} fill={SKIN.light} opacity={0.8} />
      {open ? (
        <g fill={NAIL} stroke={OUTLINE} strokeWidth={1.3}>
          <ellipse cx={ex + 13} cy={ey - 6.5} rx={2.4} ry={3} />
          <ellipse cx={ex + 15} cy={ey} rx={2.4} ry={3} />
          <ellipse cx={ex + 13} cy={ey + 6.5} rx={2.4} ry={3} />
        </g>
      ) : (
        <Nails x={ex} y={ey - 11.5} dir={-1} />
      )}
    </g>
  );
}

function Mouth({ pose }: { pose: PartnerPose }) {
  if (pose === 'idle') {
    return <path d="M106 116.5Q120 126 134 116.5" fill="none" stroke={OUTLINE} strokeWidth={2.5} strokeLinecap="round" />;
  }
  const big = pose === 'celebrate';
  const w = big ? 13 : 10.5;
  const h = big ? 13 : 9.5;
  return (
    <g>
      <path
        d={`M${120 - w} 115.5Q120 119 ${120 + w} 115.5Q${120 + w * 0.85} ${115.5 + h} 120 ${115.5 + h}Q${120 - w * 0.85} ${115.5 + h} ${120 - w} 115.5Z`}
        fill={MOUTH}
        stroke={OUTLINE}
        strokeWidth={2.3}
        strokeLinejoin="round"
      />
      <ellipse cx={120} cy={115.5 + h * 0.72} rx={w * 0.45} ry={h * 0.22} fill={TONGUE} />
    </g>
  );
}

function Head({ pose, p, anim }: { pose: PartnerPose; p: string; anim: boolean }) {
  const eyes: EyeKind = pose === 'celebrate' ? 'closed' : pose === 'encourage' ? 'happy' : pose === 'guide' ? 'open' : 'calm';
  const look = pose === 'guide' ? 2.4 : 0;
  const blink = pose === 'idle' || pose === 'guide' ? ac(p, anim, 'blink') : undefined;
  return (
    <g>
      <Shade id={`${p}-tth`} d={HEAD_D} tone={SKIN}>
        <SubTone id={`${p}-ttm`} d={HEAD_D} region={MUZZLE_REGION} tone={MUZZLE} />
        <ellipse cx={96} cy={74} rx={13} ry={4.6} fill={SKIN.light} transform="rotate(-10 96 74)" />
        <circle cx={87} cy={85} r={4.2} fill={SKIN.light} />
        <circle cx={83} cy={94} r={2.4} fill={SKIN.light} />
        <circle cx={153} cy={85} r={4.2} fill={SKIN.light} />
        <circle cx={157} cy={94} r={2.4} fill={SKIN.light} />
      </Shade>
      <ellipse cx={88} cy={111} rx={7} ry={4.4} fill={BLUSH} opacity={0.6} />
      <ellipse cx={152} cy={111} rx={7} ry={4.4} fill={BLUSH} opacity={0.6} />
      <g className={blink}>
        <Eye x={101} y={97} kind={eyes} rx={6.6} ry={8.2} look={look} lid={SKIN.main} />
        <Eye x={139} y={97} kind={eyes} rx={6.6} ry={8.2} look={look} lid={SKIN.main} />
      </g>
      <ellipse cx={115.5} cy={109} rx={1.5} ry={1.1} fill={OUTLINE} />
      <ellipse cx={124.5} cy={109} rx={1.5} ry={1.1} fill={OUTLINE} />
      <Mouth pose={pose} />
    </g>
  );
}

export function TurtleArt({ pose, p, anim, headItem, neckItem }: CharacterProps) {
  const rig = TURTLE_RIG[pose];
  const lean = pose === 'guide' ? 5 : pose === 'encourage' ? 3 : 0;
  return (
    <g>
      {[false, true].map((mirror) => (
        <g key={mirror ? 'r' : 'l'} transform={mirror ? 'translate(240 0) scale(-1 1)' : undefined}>
          <path d={rr(35, 191, 27, 24, 10)} fill={SKIN.dark} stroke={OUTLINE} strokeWidth={SW} />
          <g fill={NAIL} stroke={OUTLINE} strokeWidth={1.2}>
            <ellipse cx={42} cy={211.5} rx={2.6} ry={2} />
            <ellipse cx={49} cy={212} rx={2.6} ry={2} />
          </g>
        </g>
      ))}
      <ShellLamp p={p} anim={anim} big={pose === 'celebrate'} />
      <Shell p={p} />
      {pose === 'encourage' && <RaisedLeg sx={150} sy={194} ex={177} ey={161} />}
      {pose === 'celebrate' && (
        <>
          <RaisedLeg sx={90} sy={194} ex={63} ey={161} />
          <RaisedLeg sx={150} sy={194} ex={177} ey={161} />
        </>
      )}
      {pose === 'guide' && (
        <g className={ac(p, anim, 'point')}>
          <RaisedLeg sx={150} sy={196} ex={187} ey={178} open />
        </g>
      )}
      <g transform={lean ? `rotate(${lean} 120 196)` : undefined}>
        <path d={NECK_D} fill={SKIN.main} stroke={OUTLINE} strokeWidth={SW} />
        <path d={rr(109, 150, 22, 40, 11)} fill={SKIN.light} opacity={0.8} />
        <path d="M108 171Q120 175 132 171M109 180Q120 184 131 180" fill="none" stroke={SKIN.dark} strokeWidth={2} strokeLinecap="round" />
        {neckItem && <g transform={anchorTransform(rig.neck)}>{neckItem}</g>}
      </g>
      <Rim p={p} />
      {pose !== 'celebrate' && <StandingLeg x={69} />}
      {pose === 'idle' && <StandingLeg x={141} />}
      <g transform={lean ? `rotate(${lean} 120 196)` : undefined}>
        <g className={pose === 'encourage' ? ac(p, anim, 'nod') : undefined}>
          <g transform={`translate(0 ${HEAD_DY})`}>
            <Head pose={pose} p={p} anim={anim} />
            {headItem && <g transform={anchorTransform(rig.head)}>{headItem}</g>}
          </g>
        </g>
      </g>
      {pose === 'encourage' && <Heart x={198} y={128} s={8.5} className={ac(p, anim, 'heart')} />}
      {pose === 'celebrate' && <CelebrateSparkles spots={SPARKLES} p={p} anim={anim} />}
    </g>
  );
}
