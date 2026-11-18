import { useEffect, useState } from 'react';
import { BuildingSvg } from '../../art/buildings';
import { BUILDINGS, BUILDING_COUNT, STAGES_PER_BUILDING } from '../../config/buildings';
import { keysForStage } from '../../config/keys';
import { RULES } from '../../config/rules';
import { THEMES, themeById, type ThemeId } from '../../config/shop';
import { modeLockReason, modeOpen, remainingBuildings } from '../../core/game';
import type { Mode } from '../../core/types';
import { TopBar } from '../components/Chrome';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { useAppState, useController } from '../hooks';
import { MODE_NAMES, keyCapName } from '../text';
import { useStarter } from '../useStarter';

/** P10 灯光节 */
export function FestivalPage() {
  const c = useController();
  const { save } = useAppState();
  const { begin, dialog, error } = useStarter();
  const stage = save.course.stage;
  const [freeStage, setFreeStage] = useState(stage);
  const [freeMode, setFreeMode] = useState<Mode>('keys');
  const [custom, setCustom] = useState<string[]>([]);
  const [customMode, setCustomMode] = useState<'keys' | 'strip'>('keys');
  const [buyTheme, setBuyTheme] = useState<ThemeId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (save.festival.unlocked && !save.seen['festival-intro']) {
      c.speak('festivalOpen');
      c.see('festival-intro');
    }
  }, [c, save.festival.unlocked, save.seen]);

  if (!save.festival.unlocked) {
    return (
      <div className="page festival">
        <TopBar title="灯光节" onBack={() => c.go({ name: 'town' })} backLabel="小镇" />
        <div className="card festival__locked">
          <BuildingSvg
            index={BUILDING_COUNT - 1}
            stage={save.buildings[BUILDING_COUNT - 1]}
            theme={save.theme}
            animate={false}
            title={`${BUILDINGS[BUILDING_COUNT - 1].name}，已点亮 ${save.buildings[BUILDING_COUNT - 1]}/${STAGES_PER_BUILDING}`}
            className="festival__locked-art"
          />
          <h2>
            <Icon name="lock" size={26} /> 灯光节还没开放
          </h2>
          <p>把小镇的 12 座建筑全部点亮以后，灯光节就会开放。还差 {remainingBuildings(save)} 座建筑。</p>
          <p className="hint-line">灯光节里可以复习容易按错的键、自由练习，还能购买新的灯光主题。</p>
          <button type="button" className="btn btn--primary btn--large" onClick={() => c.go({ name: 'town' })}>
            去点亮建筑
          </button>
        </div>
      </div>
    );
  }

  const round = save.festival.round;
  const done = round?.done ?? [false, false, false];
  const nextIndex = done.indexOf(false);
  const roundLevels = [
    '易错键 · 逐键点窗',
    modeOpen(stage, 'strip') ? '均衡练习 · 连接灯带' : '均衡练习 · 逐键点窗',
    modeOpen(stage, 'sign') ? '单词 · 点亮招牌' : '巩固 · 逐键点窗',
  ];
  const opened = keysForStage(stage);
  const toggleKey = (k: string) => setCustom((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  const freeModeOk = modeOpen(freeStage, freeMode);

  return (
    <div className="page festival">
      <TopBar title="灯光节" onBack={() => c.go({ name: 'town' })} backLabel="小镇" showCoins />
      {error && (
        <p className="notice-line" role="alert">
          {error}
        </p>
      )}
      <div className="festival__grid">
        <section className="card festival__round" aria-labelledby="fest-round">
          <h2 id="fest-round">易错复习</h2>
          <p>每一轮 3 关，没有时间和次数限制。3 关都完成再得 {RULES.rewards.festivalRound} 灯光币，并且全镇一起庆祝。</p>
          <ol className="round-steps">
            {roundLevels.map((label, i) => (
              <li key={label} className={done[i] ? 'round-steps__item round-steps__item--done' : 'round-steps__item'}>
                <span className="round-steps__mark">{done[i] ? <Icon name="check" size={18} /> : i + 1}</span>
                {label}
                {done[i] && <span className="visually-hidden">（已完成）</span>}
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn--primary btn--large" onClick={() => begin({ entry: 'festival' })}>
            <Icon name="star" size={22} />
            {round ? `继续本轮：第 ${nextIndex + 1} 关` : '开始新一轮'}
          </button>
          <p className="hint-line">已完成 {save.festival.roundsCompleted} 轮。灯光节的关不会点亮建筑，也不计入学新按键的进度。</p>
        </section>

        <section className="card festival__free" aria-labelledby="fest-free">
          <h2 id="fest-free">自由练习</h2>
          <fieldset className="free-block">
            <legend>按课程练习</legend>
            <label className="field">
              <span>课程</span>
              <select value={freeStage} onChange={(e) => setFreeStage(Number(e.target.value))}>
                {Array.from({ length: stage }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s}>
                    第 {s} 阶
                  </option>
                ))}
              </select>
            </label>
            <div className="chip-row" role="group" aria-label="玩法">
              {(['keys', 'strip', 'sign'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`chip-btn${freeMode === m ? ' chip-btn--on' : ''}`}
                  aria-pressed={freeMode === m}
                  disabled={!modeOpen(freeStage, m)}
                  onClick={() => setFreeMode(m)}
                >
                  {!modeOpen(freeStage, m) && <Icon name="lock" size={14} />}
                  {MODE_NAMES[m]}
                </button>
              ))}
            </div>
            {!freeModeOk && <p className="lock-note">{modeLockReason(freeStage, freeMode)}</p>}
            <button type="button" className="btn" disabled={!freeModeOk} onClick={() => begin({ entry: 'free', mode: freeMode, stage: freeStage })}>
              开始练习
            </button>
          </fieldset>
          <fieldset className="free-block">
            <legend>自选按键（至少 2 个，只能选学过的）</legend>
            <div className="key-picker" role="group" aria-label="选择按键">
              {opened.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`keycap keycap--toggle${custom.includes(k) ? ' keycap--on' : ''}${k === ' ' ? ' keycap--space' : ''}`}
                  aria-pressed={custom.includes(k)}
                  onClick={() => toggleKey(k)}
                >
                  {keyCapName(k)}
                </button>
              ))}
            </div>
            <div className="chip-row" role="group" aria-label="玩法">
              {(['keys', 'strip'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`chip-btn${customMode === m ? ' chip-btn--on' : ''}`}
                  aria-pressed={customMode === m}
                  disabled={!modeOpen(stage, m)}
                  onClick={() => setCustomMode(m)}
                >
                  {MODE_NAMES[m]}
                </button>
              ))}
            </div>
            <p className="hint-line">自选按键不能和单词玩法一起用；想练单词，请选“按课程练习”里的点亮招牌。</p>
            <button
              type="button"
              className="btn"
              disabled={custom.length < RULES.customKeysMin}
              onClick={() => begin({ entry: 'free', mode: customMode, keys: custom })}
            >
              {custom.length < RULES.customKeysMin ? `再选 ${RULES.customKeysMin - custom.length} 个按键` : `用这 ${custom.length} 个按键练习`}
            </button>
          </fieldset>
        </section>

        <section className="card festival__themes" aria-labelledby="fest-themes">
          <h2 id="fest-themes">装饰主题</h2>
          <p>换上新的灯光颜色，点亮过的建筑都会换色。</p>
          <div className="theme-grid">
            {THEMES.map((t) => {
              const owned = save.themesOwned.includes(t.id);
              const applied = save.theme === t.id;
              return (
                <div key={t.id} className={`theme-card${applied ? ' theme-card--on' : ''}`}>
                  <BuildingSvg index={11} stage={STAGES_PER_BUILDING} theme={t.id} animate={false} title={`${t.name}主题预览`} className="theme-card__art" />
                  <span className="theme-card__name">{t.name}</span>
                  {applied ? (
                    <span className="badge badge--current">
                      <Icon name="check" size={16} />
                      使用中
                    </span>
                  ) : owned ? (
                    <button
                      type="button"
                      className="btn btn--small"
                      onClick={() => {
                        if (c.applyTheme(t.id) === null) setMessage(`已换成${t.name}主题。`);
                      }}
                    >
                      使用
                    </button>
                  ) : (
                    <>
                      <button type="button" className="btn btn--small btn--primary" disabled={save.coins < t.price} onClick={() => setBuyTheme(t.id)}>
                        <Icon name="coin" size={18} />
                        {t.price} 购买
                      </button>
                      {save.coins < t.price && <span className="hint-line">还差 {t.price - save.coins} 灯光币</span>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {message && (
            <p className="notice-line" role="status">
              {message}
            </p>
          )}
          <p className="hint-line">全部买齐以后，灯光币会继续保留。</p>
        </section>
      </div>

      {buyTheme && (
        <Dialog
          title={`购买${themeById(buyTheme)!.name}主题？`}
          onClose={() => setBuyTheme(null)}
          actions={
            <>
              <button type="button" className="btn" data-autofocus onClick={() => setBuyTheme(null)}>
                取消
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  const t = themeById(buyTheme)!;
                  const err = c.buyTheme(buyTheme);
                  setBuyTheme(null);
                  setMessage(err === null ? `买好了，已经换成${t.name}主题！` : err === 'owned' ? '已经买过了，不会重复扣币。' : '灯光币还不够。');
                }}
              >
                购买
              </button>
            </>
          }
        >
          <p>
            用 {themeById(buyTheme)!.price} 灯光币购买，买下后马上换上。现在有 {save.coins} 灯光币。
          </p>
        </Dialog>
      )}
      {dialog}
    </div>
  );
}
