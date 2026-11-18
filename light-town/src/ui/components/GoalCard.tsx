import { PHASE2_RULES } from '../../config/phase2/rules';
import { nextShopGoal } from '../../core/game';
import { Icon } from '../components/Icon';
import { useController, useAppState } from '../hooks';

/**
 * 下一目标卡（2026-11-17 新增）：显示最便宜的还没买到的商品和「还差几次任务」，
 * 让每次任务拿到的灯光币都对着一个看得见的目标。纯派生数据，不进存档。
 */
export function GoalCard({ compact = false }: { compact?: boolean }) {
  const c = useController();
  const { save } = useAppState();
  const goal = nextShopGoal(save);

  if (!goal) {
    return (
      <div className="card goal-card goal-card--done">
        <h2>全部装扮都收集齐啦！</h2>
        <p className="hint-line">衣柜里的每件装备和小镇主题都是你的了。继续练习，保持这份灯火吧。</p>
      </div>
    );
  }

  const remaining = Math.max(0, goal.price - save.coins);
  const tasksNeeded = Math.ceil(remaining / PHASE2_RULES.rewards.repeat);
  const percent = Math.min(100, Math.round((save.coins / goal.price) * 100));

  return (
    <div className={`card goal-card${compact ? ' goal-card--compact' : ''}`}>
      <h2>
        <Icon name="star" size={22} />
        下一个目标：{goal.name}
      </h2>
      <div
        className="goal-card__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal.price}
        aria-valuenow={Math.min(save.coins, goal.price)}
        aria-label={`攒灯光币买${goal.name}的进度`}
      >
        <div className="goal-card__fill" style={{ width: `${percent}%` }} />
        <span className="goal-card__count">
          <Icon name="coin" size={18} />
          {Math.min(save.coins, goal.price)}/{goal.price}
        </span>
      </div>
      {remaining === 0 ? (
        <p className="goal-card__ready">灯光币够啦！去衣柜把它带回家吧。</p>
      ) : (
        <p className="goal-card__hint">
          还差 {remaining} 个灯光币——再完成 {tasksNeeded} 次任务就够啦。
        </p>
      )}
      <button type="button" className="btn btn--small goal-card__shop" onClick={() => c.go({ name: 'wardrobe' })}>
        <Icon name="hanger" size={18} />
        去衣柜
      </button>
    </div>
  );
}
