import { PartnerArt } from '../../art/partners';
import { STAGES_PER_BUILDING } from '../../config/buildings';
import { formatAccuracy } from '../../core/scoring';
import { formatDuration } from '../../core/time';
import type { SessionSummary } from '../../core/types';
import { TopBar } from '../components/Chrome';
import { Icon } from '../components/Icon';
import { useAnimate, useAppState, useController } from '../hooks';
import { buildingName } from '../text';

/** P07 本次成果 */
export function SummaryPage({ summary }: { summary: SessionSummary }) {
  const c = useController();
  const { save } = useAppState();
  const animate = useAnimate();
  return (
    <div className="page summary">
      <TopBar title="本次成果" showCoins />
      <div className="summary__layout">
        {save.partner && (
          <PartnerArt partner={save.partner} pose="encourage" equipped={save.equipped} animate={animate} title="小伙伴陪你看成果" className="summary__partner" />
        )}
        <section className="card summary__card">
          <h2>{summary.levelsCompleted > 0 ? `这次完成了 ${summary.levelsCompleted} 关` : '这次还没有完成整关'}</h2>
          <dl className="stat-list">
            <div>
              <dt>完成关数</dt>
              <dd>{summary.levelsCompleted} 关</dd>
            </div>
            <div>
              <dt>有效时长</dt>
              <dd>{formatDuration(summary.effectiveMs)}</dd>
            </div>
            <div>
              <dt>准确率</dt>
              <dd>
                {formatAccuracy(summary.correct, summary.attempts)}
                <span className="stat-list__sub">
                  按对 {summary.correct} 次，共按 {summary.attempts} 次（所有关合在一起计算）
                </span>
              </dd>
            </div>
            <div>
              <dt>灯光币</dt>
              <dd>
                <span className="coin-gain">
                  <Icon name="coin" size={24} />+{summary.coins}
                </span>
              </dd>
            </div>
            <div>
              <dt>建筑变化</dt>
              <dd>
                {summary.buildingChanges.length === 0 ? (
                  '这次没有点亮新的灯'
                ) : (
                  <ul className="plain-list">
                    {summary.buildingChanges.map((ch) => (
                      <li key={ch.index}>
                        {buildingName(ch.index)}：{ch.from}/{STAGES_PER_BUILDING} → {ch.to}/{STAGES_PER_BUILDING}
                        {ch.to === STAGES_PER_BUILDING ? '（全部点亮）' : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>
          {summary.partialLevel && (
            <p className="hint-line">
              最后一关还没完成（按了 {summary.partialLevel.attempts} 次），这些按键已经算进记录，但没完成的关不发奖励。下次可以继续。
            </p>
          )}
          <div className="page-actions">
            <button type="button" className="btn btn--primary btn--large" onClick={() => c.go({ name: 'town' })}>
              <Icon name="home" size={24} />
              回小镇
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
