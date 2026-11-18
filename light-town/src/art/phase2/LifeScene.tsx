import { useId } from 'react';
import { BuildingSvg } from '../buildings';
import { THEME_LIGHTS, UNLIT } from '../palette';
import { INK, TONES } from '../buildings/materials';
import type { ThemeId } from '../../config/shop';
import type { Phase2Language } from '../../config/phase2/content';
import { BUILDINGS } from '../../config/buildings';

/**
 * 第二阶段生活场景：建筑 + 本步骤的整理道具（第一次 1 个托盘、第二次 2 个分类格、
 * 第三次 3 个交付位）+ 数字计数。中英文用卡片内容区分，不只靠颜色。
 */
export interface LifeSceneProps {
  buildingId: string;
  /** 0 基步骤。 */
  step: number;
  /** 本步骤已完成的题数。 */
  count: number;
  /** 本步骤题数。 */
  total: number;
  language: Phase2Language;
  theme: ThemeId;
  /** 建筑的永久点亮阶段（生活动画不改变永久灯光）。 */
  buildingStage: number;
  animate: boolean;
  title: string;
  className?: string;
}

function buildingIndexOf(buildingId: string): number {
  const b = BUILDINGS.find((x) => x.id === buildingId);
  return b ? b.index : 0;
}

export function LifeScene(props: LifeSceneProps) {
  const { buildingId, step, count, total, language, theme, buildingStage, animate, title, className } = props;
  return (
    <figure className={`life-scene${className ? ` ${className}` : ''}`}>
      <BuildingSvg
        index={buildingIndexOf(buildingId)}
        stage={buildingStage}
        theme={theme}
        animate={animate}
        title={title}
        className="life-scene__building"
      />
      <LifeProps step={step} count={count} total={total} language={language} animate={animate} />
      <figcaption className="life-scene__caption">
        <span className="chip chip--lang">{language === 'zh' ? '中文' : '英文'}</span>
        <span>
          第 {step + 1}/3 步 · 已整理 {count}/{total}
        </span>
      </figcaption>
    </figure>
  );
}

function LifeProps({ step, count, total, language, animate }: { step: number; count: number; total: number; language: Phase2Language; animate: boolean }) {
  const cells = step === 0 ? 1 : step === 1 ? 2 : 3;
  const per = Math.ceil(total / cells);
  return (
    <div className={`life-props life-props--${cells}`} role="img" aria-label={`本步骤已整理 ${count}/${total}`}>
      {Array.from({ length: cells }, (_, i) => {
        const cellCount = Math.max(0, Math.min(per, count - i * per));
        return (
          <div key={i} className="life-cell">
            <div className="life-cell__slot">
              {Array.from({ length: Math.min(cellCount, 3) }, (_, k) => (
                <span key={k} className={`life-card life-card--${language}${animate ? ' life-card--pop' : ''}`} style={{ animationDelay: `${k * 0.12}s` }}>
                  {language === 'zh' ? '字' : 'Aa'}
                </span>
              ))}
              {cellCount > 3 && <span className="life-card life-card--more">×{cellCount}</span>}
            </div>
            <span className="life-cell__num">{cellCount}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ 完成效果 */

export interface LifeEffectProps {
  buildingId: string;
  theme: ThemeId;
  animate: boolean;
  title: string;
  className?: string;
}

/** 12 种建筑生活完成动画（TASKS.md「完成动画」列）；减少动画时显示静态完成态。 */
export function LifeEffect({ buildingId, theme, animate, title, className }: LifeEffectProps) {
  const L = THEME_LIGHTS[theme];
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const u = `fx${raw}`;
  const cls = (n: string) => (animate ? `${u}-${n}` : undefined);
  const kind = buildingId as EffectKind;
  return (
    <svg viewBox="0 0 240 150" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <style>{effectCss(u)}</style>
      <EffectBody kind={kind} L={L} cls={cls} animate={animate} />
    </svg>
  );
}

type EffectKind =
  | 'lamp-house'
  | 'bakery'
  | 'post-office'
  | 'flower-house'
  | 'clock-tower'
  | 'library'
  | 'music-house'
  | 'observatory'
  | 'windmill'
  | 'lighthouse'
  | 'boathouse'
  | 'festival-hall';

function EffectBody({
  kind,
  L,
  cls,
  animate,
}: {
  kind: EffectKind;
  L: { core: string; light: string; glow: string; halo: string };
  cls: (n: string) => string | undefined;
  animate: boolean;
}) {
  const ground = (
    <ellipse cx="120" cy="128" rx="86" ry="12" fill="rgba(13, 24, 56, 0.55)" />
  );
  switch (kind) {
    case 'lamp-house':
      return (
        <g>
          {ground}
          <rect x="78" y="46" width="84" height="70" rx="8" fill={UNLIT.top} stroke={UNLIT.edge} strokeWidth="2" />
          <rect x="94" y="60" width="52" height="40" rx="5" fill={L.light} opacity="0.9" />
          {/* 窗边伙伴挥手：小狐狸从窗边探出并挥动爪子 */}
          <g className={cls('wave')} style={animate ? { transformOrigin: '168px 84px' } : undefined}>
            <ellipse cx="168" cy="86" rx="12" ry="14" fill={TONES.roofPlum.top} stroke={INK.frame} strokeWidth="1.6" />
            <circle cx="176" cy="72" r="7" fill={TONES.roofPlum.top} stroke={INK.frame} strokeWidth="1.6" />
            <path d="M170 66 l-3 -7 5 3 Z M182 66 l3 -7 -5 3 Z" fill={TONES.roofPlum.top} stroke={INK.frame} strokeWidth="1.2" />
          </g>
          <circle cx="120" cy="80" r="26" fill={L.halo} />
        </g>
      );
    case 'bakery':
      return (
        <g>
          {ground}
          <rect x="70" y="40" width="100" height="76" rx="8" fill={UNLIT.top} stroke={UNLIT.edge} strokeWidth="2" />
          <rect x="88" y="56" width="64" height="44" rx="6" fill={UNLIT.windowFill} stroke={UNLIT.windowFrame} strokeWidth="2" />
          <g className={cls('slide-basket')}>
            <g>
              <path d="M96 92 q14 12 28 0 l-4 -14 h-20 Z" fill={TONES.sand.left} stroke={INK.frame} strokeWidth="1.6" />
              <rect x="99" y="70" width="22" height="9" rx="4" fill={L.light} />
            </g>
          </g>
          <rect x="88" y="56" width="64" height="44" rx="6" fill={L.halo} opacity={animate ? undefined : '0.5'} />
        </g>
      );
    case 'post-office':
      return (
        <g>
          {ground}
          <rect x="90" y="66" width="34" height="50" rx="6" fill={UNLIT.top} stroke={UNLIT.edge} strokeWidth="2" />
          <rect x="98" y="78" width="18" height="12" rx="3" fill={UNLIT.windowFill} stroke={UNLIT.windowFrame} strokeWidth="1.6" />
          {/* 纸飞机绕信箱一圈 */}
          <g className={cls('orbit-plane')}>
            <path d="M0 -6 l14 6 -14 6 3 -6 Z" fill={L.core} stroke={INK.frame} strokeWidth="1" transform="translate(120, 20)" />
          </g>
        </g>
      );
    case 'flower-house':
      return (
        <g>
          {ground}
          {[76, 120, 164].map((x, i) => (
            <g key={x} className={cls(`bloom${i}`)} style={animate ? { transformOrigin: `${x}px 108px` } : { transformOrigin: `${x}px 108px` }}>
              <path d={`M${x} 108 q-3 -16 0 -26 q3 10 0 26`} stroke={INK.leaf} strokeWidth="3" fill="none" />
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse
                  key={a}
                  cx={x}
                  cy={74}
                  rx="7"
                  ry="11"
                  fill={i === 0 ? L.light : i === 1 ? '#FFB3C7' : L.core}
                  stroke={INK.frame}
                  strokeWidth="1"
                  transform={`rotate(${a} ${x} 74)`}
                  opacity="0.92"
                />
              ))}
              <circle cx={x} cy={74} r="5" fill={L.glow} />
            </g>
          ))}
        </g>
      );
    case 'clock-tower':
      return (
        <g>
          {ground}
          <rect x="98" y="20" width="44" height="96" rx="7" fill={UNLIT.top} stroke={UNLIT.edge} strokeWidth="2" />
          <circle cx="120" cy="52" r="20" fill={L.core} stroke={INK.frame} strokeWidth="2" />
          <path d="M120 52 l0 -12 M120 52 l8 5" stroke={INK.frame} strokeWidth="2" strokeLinecap="round" />
          {/* 钟摆轻摆一次 */}
          <g className={cls('pendulum')} style={animate ? { transformOrigin: '120px 84px' } : { transformOrigin: '120px 84px' }}>
            <path d="M120 84 l0 26" stroke={INK.frame} strokeWidth="2.4" />
            <circle cx="120" cy="114" r="6" fill={L.light} stroke={INK.frame} strokeWidth="1.6" />
          </g>
        </g>
      );
    case 'library':
      return (
        <g>
          {ground}
          <rect x="72" y="36" width="96" height="80" rx="8" fill={UNLIT.top} stroke={UNLIT.edge} strokeWidth="2" />
          <path d="M84 92 h72 M84 72 h72" stroke={UNLIT.windowFrame} strokeWidth="3" />
          {/* 三本书依次归位 */}
          {[96, 120, 144].map((x, i) => (
            <g key={x} className={cls(`book${i}`)}>
              <rect x={x - 9} y="56" width="18" height="16" rx="2.5" fill={i === 0 ? L.light : i === 1 ? L.core : L.glow} stroke={INK.frame} strokeWidth="1.4" />
              <path d={`M${x - 4} 60 h8 M${x - 4} 64 h6`} stroke={INK.frame} strokeWidth="1" opacity="0.7" />
            </g>
          ))}
        </g>
      );
    case 'music-house':
      return (
        <g>
          {ground}
          <rect x="76" y="44" width="88" height="72" rx="9" fill={UNLIT.top} stroke={UNLIT.edge} strokeWidth="2" />
          <circle cx="104" cy="72" r="9" fill={UNLIT.windowFill} stroke={UNLIT.windowFrame} strokeWidth="2" />
          <circle cx="136" cy="72" r="9" fill={UNLIT.windowFill} stroke={UNLIT.windowFrame} strokeWidth="2" />
          {/* 三个音符缓缓上浮 */}
          {[96, 120, 144].map((x, i) => (
            <g key={x} className={cls(`note${i}`)}>
              <ellipse cx={x} cy={62 - i * 4} rx="6" ry="4.6" fill={L.light} stroke={INK.frame} strokeWidth="1.2" transform={`rotate(-18 ${x} ${62 - i * 4})`} />
              <path d={`M${x + 5} ${60 - i * 4} v-16 q4 2 6 4`} stroke={INK.frame} strokeWidth="1.6" fill="none" />
            </g>
          ))}
        </g>
      );
    case 'observatory':
      return (
        <g>
          {ground}
          <path d="M76 116 q44 -34 88 0 Z" fill={UNLIT.left} stroke={UNLIT.edge} strokeWidth="2" />
          <circle cx="120" cy="58" r="26" fill={UNLIT.top} stroke={UNLIT.edge} strokeWidth="2" />
          <circle cx="120" cy="58" r="26" fill={L.halo} />
          {/* 三颗星依次闪亮 */}
          {[[100, 44], [122, 36], [140, 50]].map(([x, y], i) => (
            <path
              key={i}
              d={`M${x} ${y - 7} l2.2 4.8 5.2 0.6 -3.8 3.6 1 5.2 -4.6 -2.6 -4.6 2.6 1 -5.2 -3.8 -3.6 5.2 -0.6 Z`}
              fill={L.core}
              className={cls(`star${i}`)}
            />
          ))}
        </g>
      );
    case 'windmill':
      return (
        <g>
          {ground}
          <path d="M104 116 l6 -70 h20 l6 70 Z" fill={UNLIT.left} stroke={UNLIT.edge} strokeWidth="2" />
          {/* 风车转过四分之一圈 */}
          <g className={cls('mill')} style={animate ? { transformOrigin: '120px 44px' } : { transformOrigin: '120px 44px', transform: 'rotate(90deg)' }}>
            {[0, 90, 180, 270].map((a) => (
              <ellipse key={a} cx="120" cy="28" rx="5.5" ry="15" fill={L.light} stroke={INK.frame} strokeWidth="1.4" transform={`rotate(${a} 120 44)`} />
            ))}
            <circle cx="120" cy="44" r="5" fill={L.core} stroke={INK.frame} strokeWidth="1.6" />
          </g>
        </g>
      );
    case 'lighthouse':
      return (
        <g>
          {ground}
          <path d="M108 116 l5 -66 h14 l5 66 Z" fill={UNLIT.top} stroke={UNLIT.edge} strokeWidth="2" />
          <rect x="106" y="38" width="28" height="14" rx="4" fill={L.light} stroke={INK.frame} strokeWidth="1.6" />
          {/* 一束暖光扫过海面 */}
          <path className={cls('beam')} d="M120 44 L196 84 L196 106 Z" fill={L.halo} opacity={animate ? undefined : '0.7'} />
          <path d="M34 122 q18 -7 36 0 t36 0 t36 0 t36 0" stroke={UNLIT.windowFrame} strokeWidth="2.4" fill="none" opacity="0.7" />
        </g>
      );
    case 'boathouse':
      return (
        <g>
          <ellipse cx="120" cy="126" rx="90" ry="12" fill="rgba(13, 24, 56, 0.55)" />
          {/* 小船轻轻起伏 */}
          <g className={cls('bob')}>
            <path d="M74 108 q46 18 92 0 l-10 -16 h-72 Z" fill={TONES.wood.top} stroke={INK.frame} strokeWidth="2" />
            <rect x="112" y="74" width="16" height="20" rx="3" fill={L.light} stroke={INK.frame} strokeWidth="1.6" />
            <path d="M60 118 q18 -6 36 0 t36 0 t36 0" stroke={UNLIT.windowFrame} strokeWidth="2.2" fill="none" opacity="0.7" />
          </g>
        </g>
      );
    case 'festival-hall':
      return (
        <g>
          {ground}
          <rect x="72" y="42" width="96" height="74" rx="9" fill={UNLIT.top} stroke={UNLIT.edge} strokeWidth="2" />
          <path d="M72 48 q48 22 96 0" stroke={UNLIT.windowFrame} strokeWidth="2.4" fill="none" />
          {/* 三盏临时彩灯点亮（不是永久灯光） */}
          {[92, 120, 148].map((x, i) => (
            <g key={x} className={cls(`lantern${i}`)}>
              <path d={`M${x} 58 v10`} stroke={INK.frame} strokeWidth="1.4" />
              <ellipse cx={x} cy={80} rx="10" ry="13" fill={[L.light, L.glow, L.core][i]} stroke={INK.frame} strokeWidth="1.6" />
              <ellipse cx={x} cy={80} rx="15" ry="18" fill={L.halo} />
            </g>
          ))}
        </g>
      );
  }
}

/** 一次性效果动画的 keyframes（挂在组件内，uid 前缀避免冲突）。 */
function effectCss(u: string): string {
  const still = `
.${u}-wave, .${u}-slide-basket, .${u}-orbit-plane, .${u}-pendulum, .${u}-mill, .${u}-beam, .${u}-bob,
.${u}-bloom0, .${u}-bloom1, .${u}-bloom2, .${u}-book0, .${u}-book1, .${u}-book2,
.${u}-note0, .${u}-note1, .${u}-note2, .${u}-star0, .${u}-star1, .${u}-star2,
.${u}-lantern0, .${u}-lantern1, .${u}-lantern2 { }`;
  const animated = `
.${u}-wave { animation: ${u}-wave 0.9s ease-in-out 2; }
@keyframes ${u}-wave { 0%,100% { transform: rotate(0deg);} 50% { transform: rotate(-16deg);} }
.${u}-slide-basket { animation: ${u}-basket 1.4s ease-in-out forwards; }
@keyframes ${u}-basket { 0% { transform: translate(-30px, 6px);} 100% { transform: translate(0, 0);} }
.${u}-orbit-plane { animation: ${u}-orbit 1.8s linear forwards; transform-origin: 120px 84px; }
@keyframes ${u}-orbit { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }
.${u}-pendulum { animation: ${u}-pendulum 1.6s ease-in-out forwards; }
@keyframes ${u}-pendulum { 0%,100% { transform: rotate(0deg);} 30% { transform: rotate(14deg);} 65% { transform: rotate(-10deg);} }
.${u}-mill { animation: ${u}-mill 1.2s cubic-bezier(0.3, 0.7, 0.4, 1) forwards; }
@keyframes ${u}-mill { 0% { transform: rotate(0deg);} 100% { transform: rotate(90deg);} }
.${u}-beam { transform-origin: 120px 44px; animation: ${u}-beam 1.6s ease-in-out forwards; }
@keyframes ${u}-beam { 0% { transform: rotate(-24deg); opacity: 0;} 45% { opacity: 0.85;} 100% { transform: rotate(20deg); opacity: 0.4;} }
.${u}-bob { animation: ${u}-bob 2.2s ease-in-out 1; }
@keyframes ${u}-bob { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-5px);} }
.${u}-bloom0 { animation: ${u}-bloom 0.9s ease-out forwards; }
.${u}-bloom1 { animation: ${u}-bloom 0.9s ease-out 0.28s forwards; }
.${u}-bloom2 { animation: ${u}-bloom 0.9s ease-out 0.56s forwards; }
@keyframes ${u}-bloom { 0% { transform: scale(0.4); opacity: 0.2;} 100% { transform: scale(1); opacity: 1;} }
.${u}-book0 { animation: ${u}-book 0.7s ease-out forwards; }
.${u}-book1 { animation: ${u}-book 0.7s ease-out 0.25s forwards; }
.${u}-book2 { animation: ${u}-book 0.7s ease-out 0.5s forwards; }
@keyframes ${u}-book { 0% { transform: translateX(-26px); opacity: 0;} 100% { transform: translateX(0); opacity: 1;} }
.${u}-note0 { animation: ${u}-note 1.6s ease-out forwards; }
.${u}-note1 { animation: ${u}-note 1.6s ease-out 0.3s forwards; }
.${u}-note2 { animation: ${u}-note 1.6s ease-out 0.6s forwards; }
@keyframes ${u}-note { 0% { transform: translateY(14px); opacity: 0;} 30% { opacity: 1;} 100% { transform: translateY(-18px); opacity: 0.9;} }
.${u}-star0 { animation: ${u}-star 1.2s ease-out forwards; }
.${u}-star1 { animation: ${u}-star 1.2s ease-out 0.35s forwards; }
.${u}-star2 { animation: ${u}-star 1.2s ease-out 0.7s forwards; }
@keyframes ${u}-star { 0%,70% { opacity: 0.15; transform: scale(0.7);} 100% { opacity: 1; transform: scale(1);} }
.${u}-lantern0 { animation: ${u}-lantern 0.9s ease-out forwards; }
.${u}-lantern1 { animation: ${u}-lantern 0.9s ease-out 0.3s forwards; }
.${u}-lantern2 { animation: ${u}-lantern 0.9s ease-out 0.6s forwards; }
@keyframes ${u}-lantern { 0% { opacity: 0.15; transform: translateY(6px) scale(0.75);} 100% { opacity: 1; transform: translateY(0) scale(1);} }`;
  return `${still}\n${animated}\n.${u}-star0, .${u}-star1, .${u}-star2 { transform-origin: center; transform-box: fill-box; }`;
}
