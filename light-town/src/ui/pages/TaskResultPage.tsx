import { useEffect, useState } from 'react';
import { BuildingSvg } from '../../art/buildings';
import { LifeEffect } from '../../art/phase2/LifeScene';
import { PartnerArt } from '../../art/partners';
import { phase2Task } from '../../config/phase2/content';
import { PHASE2_RULES } from '../../config/phase2/rules';
import { RULES } from '../../config/rules';
import { residentJustJoined } from '../../core/phase2/story';
import { formatDuration } from '../../core/time';
import { CoinBadge, SoundButton } from '../components/Chrome';
import { GoalCard } from '../components/GoalCard';
import { Icon } from '../components/Icon';
import type { Route } from '../../app/controller';
import { useAnimate, useAppState, useController } from '../hooks';
import { buildName } from '../text';

/** P06b 第二阶段结果页：完成反馈、实际金币、首次正确题数；刷新不重复结算。 */
export function TaskResultPage() {
  const c = useController();
  const { save } = useAppState();
  const animate = useAnimate();
  const result = save.lastTaskResult;
  const [celebrating, setCelebrating] = useState(true);

  useEffect(() => {
    if (!result) c.go({ name: 'residents' });
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

  if (!result) return null;
  const buildingIndex = BUILDING_INDEX.get(result.buildingId) ?? 0;
  const isStory = result.kind === 'story';
  const story = isStory ? phase2Task(result.sourceId) : null;
  const langName = result.language === 'zh' ? '中文' : '英文';
  // 居民入住（2026-11-17）：这次首次完成恰好集满该建筑全部 6 个故事 → 报喜。
  const residentJoined =
    isStory && residentJustJoined(result.buildingId, save.phase2.storyDone, result.firstReward);
  const dailyCoins = result.dailyBonusCoins ?? 0;

  const recommend: { label: string; target: Route } | null =
    result.kind === 'story'
      ? result.nextSourceId
        ? { label: '继续故事', target: { name: 'task-preview', req: { kind: 'story', taskId: result.nextSourceId } } }
        : { label: '回到居民任务', target: { name: 'residents' } }
      : result.kind === 'errand'
        ? { label: '再来一轮居民委托', target: { name: 'task-preview', req: { kind: 'errand', language: result.language } } }
        : { label: '再来一组专项', target: { name: 'drills', language: result.language } };

  return (
    <div className="page task-result">
      <header className="topbar">
        <h1 className="topbar__title">任务完成</h1>
        <div className="topbar__actions">
          <CoinBadge />
          <SoundButton />
        </div>
      </header>

      <div className="result__layout">
        <section className="result__hero">
          {isStory && buildingIndex >= 0 && (
            <BuildingSvg
              index={buildingIndex}
              stage={save.buildings[buildingIndex] ?? 0}
              theme={save.theme}
              animate={animate}
              title={`${buildName(result.buildingId)}，小镇灯光保持不变`}
              className="result__building"
            />
          )}
          <LifeEffect
            buildingId={result.buildingId}
            theme={save.theme}
            animate={celebrating && animate}
            title={isStory ? `${buildName(result.buildingId)}的生活小场景完成了` : '任务完成'}
            className="life-effect"
          />
          {save.partner && (
            <PartnerArt partner={save.partner} pose={celebrating ? 'celebrate' : 'encourage'} equipped={save.equipped} animate={animate} title="小伙伴为你高兴" className="result__partner" />
          )}
          {celebrating && (
            <button type="button" className="btn btn--small result__skip" onClick={() => setCelebrating(false)}>
              跳过动画
            </button>
          )}
        </section>

        <section className="result__details" aria-labelledby="p2-result-heading">
          <p id="p2-result-heading" className="result__encourage">
            {isStory ? `「${result.title}」完成了！${buildName(result.buildingId)}的居民谢谢你。` : `这一轮${result.kind === 'errand' ? '居民委托' : '专项练习'}完成了！`}
          </p>

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
                {langName} · {result.itemCount} 题{story ? ` · ${story.steps.map((s) => s.title).join('→')}` : ''}
              </dd>
            </div>
            <div>
              <dt>第一次就答对的题</dt>
              <dd>
                {result.firstCorrectCount}/{result.itemCount}
                <span className="stat-list__sub">独立完成（无帮助且首次正确）{result.unaidedCorrectCount} 题</span>
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
                  <Icon name="coin" size={24} />+{result.coins + dailyCoins}
                </span>
                <span className="coin-parts">
                  <span className="chip">{result.firstReward ? '故事首次完成' : isStory ? '故事重玩' : result.kind === 'errand' ? '居民委托' : '专项练习'} +{result.coins}</span>
                  {dailyCoins > 0 && <span className="chip">今日第一个任务 +{dailyCoins}</span>}
                </span>
              </dd>
            </div>
          </dl>

          <ul className="result__news">
            {result.firstReward && <li>第一次完成这个故事，得到了 {PHASE2_RULES.rewards.storyFirst} 个灯光币！以后重玩每次 {PHASE2_RULES.rewards.repeat} 个。</li>}
            {!result.firstReward && isStory && <li>重玩完成，得到 {PHASE2_RULES.rewards.repeat} 个灯光币。</li>}
            {dailyCoins > 0 && (
              <li>
                今天第一个完成的任务！额外得到 {dailyCoins} 个灯光币，已经连续 {save.phase2.dailyBonus?.streakDays ?? 1} 天啦。
              </li>
            )}
            {residentJoined && (
              <li>
                <strong>{buildName(result.buildingId)}的 6 个故事全部完成，一位新居民搬进来了！</strong>去小镇看看那扇新亮的窗吧。
              </li>
            )}
            {result.routeComplete && !result.courseComplete && <li>{langName}路线的 36 个故事全部完成啦！</li>}
            {result.courseComplete && <li>中英文两条路线的故事课程全部完成！继续用委托和专项保持练习吧。</li>}
            {!residentJoined && <li className="hint-line">小镇建筑的灯光没有变化；课程进度也没有变化。</li>}
          </ul>

          <GoalCard compact />

          <div className="page-actions">
            {recommend && (
              <button type="button" className="btn btn--primary btn--large" onClick={() => c.go(recommend.target)}>
                <Icon name="play" size={24} />
                {recommend.label}
              </button>
            )}
            <button type="button" className="btn btn--large" onClick={() => c.go({ name: 'residents' })}>
              回居民任务
            </button>
            <button type="button" className="btn btn--large" onClick={() => c.go({ name: 'town' })}>
              回小镇
            </button>
            {save.session && (
              <button type="button" className="btn btn--large" onClick={() => c.endSessionNow()}>
                结束本次
              </button>
            )}
          </div>
          <p className="hint-line">结果只结算一次：刷新这一页不会重复发奖。</p>
        </section>
      </div>
    </div>
  );
}

const BUILDING_INDEX = new Map<string, number>([
  ['lamp-house', 0],
  ['bakery', 1],
  ['post-office', 2],
  ['flower-house', 3],
  ['clock-tower', 4],
  ['library', 5],
  ['music-house', 6],
  ['observatory', 7],
  ['windmill', 8],
  ['lighthouse', 9],
  ['boathouse', 10],
  ['festival-hall', 11],
]);
