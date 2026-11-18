import { useEffect, useState } from 'react';
import { BuildingSvg, TownCelebration } from '../../art/buildings';
import { PartnerArt } from '../../art/partners';
import { DISTRICTS, STAGES_PER_BUILDING } from '../../config/buildings';
import { RULES } from '../../config/rules';
import { formatAccuracy } from '../../core/scoring';
import { formatDuration } from '../../core/time';
import type { LevelResult } from '../../core/types';
import { CoinBadge, SoundButton } from '../components/Chrome';
import { Icon } from '../components/Icon';
import { useAnimate, useAppState, useController } from '../hooks';
import { buildingName, resultHeading, stageNewKeysText, stageProgressText } from '../text';

function continueLabel(r: LevelResult): string {
  if (r.entry === 'light') return r.building?.completed && r.building.index === 11 ? '继续学习' : '继续点亮';
  if (r.entry === 'festival') return r.festival?.roundComplete ? '开始新一轮灯光节' : '下一关';
  return '再来一关';
}

/** P06 关卡结果 */
export function ResultPage() {
  const c = useController();
  const { save } = useAppState();
  const animate = useAnimate();
  const result = save.lastResult;
  const bigCelebration = !!result && (result.festivalUnlocked || !!result.festival?.roundComplete);
  const [celebrating, setCelebrating] = useState(true);

  useEffect(() => {
    if (!result) c.go({ name: 'town' });
  }, [c, result]);

  useEffect(() => {
    const id = setTimeout(() => setCelebrating(false), animate ? RULES.timing.celebrationMaxMs : 1500);
    const skip = () => setCelebrating(false);
    window.addEventListener('keydown', skip, true);
    window.addEventListener('pointerdown', skip, true);
    return () => {
      clearTimeout(id);
      window.removeEventListener('keydown', skip, true);
      window.removeEventListener('pointerdown', skip, true);
    };
  }, [animate]);

  useEffect(() => {
    if (result?.festivalUnlocked) c.speak('festivalOpen');
  }, [c, result?.festivalUnlocked]);

  if (!result) return null;
  const b = result.building;
  const coins = result.coins;
  const coinParts: [string, number][] = [
    ['完成一关', coins.base],
    ['准确奖励', coins.accuracy],
    ['建筑首次点亮', coins.building],
    ['街区首次完成', coins.district],
    ['灯光节一轮完成', coins.festival],
  ];

  return (
    <div className="page result">
      <header className="topbar">
        <h1 className="topbar__title">完成啦</h1>
        <div className="topbar__actions">
          <CoinBadge />
          <SoundButton />
        </div>
      </header>

      <div className="result__layout">
        <section className="result__hero">
          {b ? (
            <BuildingSvg
              index={b.index}
              stage={b.after}
              theme={save.theme}
              animate={animate}
              celebrate={celebrating && animate && b.completed}
              title={`${buildingName(b.index)}，${stageProgressText(b.after)}`}
              className="result__building"
            />
          ) : result.replayBuilding !== null ? (
            <BuildingSvg
              index={result.replayBuilding}
              stage={STAGES_PER_BUILDING}
              theme={save.theme}
              animate={animate}
              title={`${buildingName(result.replayBuilding)}，已全部点亮`}
              className="result__building"
            />
          ) : null}
          {save.partner && (
            <PartnerArt
              partner={save.partner}
              pose={celebrating ? 'celebrate' : 'encourage'}
              equipped={save.equipped}
              animate={animate}
              title="小伙伴为你高兴"
              className="result__partner"
            />
          )}
          {celebrating && (
            <button type="button" className="btn btn--small result__skip" onClick={() => setCelebrating(false)}>
              跳过动画
            </button>
          )}
        </section>

        <section className="result__details" aria-labelledby="result-encourage">
          <p id="result-encourage" className="result__encourage">
            {result.encouragement}
          </p>
          {b && (
            <p className="result__building-text">
              {buildingName(b.index)}：{stageProgressText(b.after)}
              {b.completed ? '，整座建筑点亮了！' : ''}
            </p>
          )}

          {result.restReminder && (
            <div className="rest-reminder" role="note">
              <strong>休息一下眼睛和小手吧</strong>
              <span>可以看看远处、甩甩手。想继续也可以继续，想结束就点“结束本次”。</span>
            </div>
          )}

          <dl className="stat-list">
            <div>
              <dt>完成内容</dt>
              <dd>
                {resultHeading(result)}
                {result.wordsCompleted && <span className="result__words">单词：{result.wordsCompleted.join('、')}</span>}
              </dd>
            </div>
            <div>
              <dt>准确率</dt>
              <dd>
                {formatAccuracy(result.correct, result.attempts)}
                <span className="stat-list__sub">
                  按对 {result.correct} 次，共按 {result.attempts} 次
                </span>
              </dd>
            </div>
            <div>
              <dt>有效时长</dt>
              <dd>{formatDuration(result.effectiveMs)}</dd>
            </div>
            <div>
              <dt>灯光币</dt>
              <dd>
                <span className="coin-gain">
                  <Icon name="coin" size={24} />+{coins.total}
                </span>
                <span className="coin-parts">
                  {coinParts
                    .filter(([, n]) => n > 0)
                    .map(([label, n]) => (
                      <span key={label} className="chip">
                        {label} +{n}
                      </span>
                    ))}
                </span>
              </dd>
            </div>
          </dl>

          <ul className="result__news">
            {result.districtOpened !== null && <li>新街区开放：{DISTRICTS[result.districtOpened].name}！</li>}
            {result.festivalUnlocked && <li>12 座建筑全部点亮，灯光节开放啦！</li>}
            {result.festival && !result.festival.roundComplete && <li>灯光节第 {result.festival.index + 1}/3 关完成。</li>}
            {result.festival?.roundComplete && <li>这一轮灯光节 3 关全部完成，额外得到 {RULES.rewards.festivalRound} 灯光币！</li>}
            {result.promotion?.promotedTo != null && (
              <li>
                新的按键开放了：第 {result.promotion.promotedTo} 阶（{stageNewKeysText(result.promotion.promotedTo)}）
              </li>
            )}
            {result.promotion?.allComplete && <li>全部按键课程已完成！以后可以在学习路线和灯光节里继续练习。</li>}
            {result.promotion && result.promotion.promotedTo == null && !result.promotion.allComplete && result.promotion.streak === 1 && (
              <li>再完成一关准确率 90% 以上的本阶练习，就能学新按键。</li>
            )}
          </ul>

          <div className="page-actions">
            <button type="button" className="btn btn--primary btn--large" onClick={() => c.continueAfterResult()}>
              <Icon name="play" size={24} />
              {continueLabel(result)}
            </button>
            <button type="button" className="btn btn--large" onClick={() => c.endSessionNow()}>
              结束本次
            </button>
          </div>
          <p className="hint-line">用键盘：先按 Tab 选中按钮（Safari 里按 Option + Tab），再按 Enter 确认。</p>
        </section>
      </div>
      {bigCelebration && celebrating && (
        <div className="celebration-layer" aria-hidden="true">
          <TownCelebration theme={save.theme} animate={animate} />
        </div>
      )}
    </div>
  );
}
