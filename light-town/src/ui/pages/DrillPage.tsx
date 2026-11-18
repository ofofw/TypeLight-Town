import { DRILL_CATEGORIES, PHASE2_RULES, type DrillCategory } from '../../config/phase2/rules';
import { phase2Item, type Phase2Language } from '../../config/phase2/content';
import { drillLockReason } from '../../core/phase2/task';
import { trickyIds } from '../../core/phase2/errand';
import { TopBar } from '../components/Chrome';
import { Icon } from '../components/Icon';
import { useAppState, useController } from '../hooks';
import { useTaskStarter } from '../useTaskStarter';

/** P10b 专项页：类别卡、描述、已学内容数量；空题池显示原因并引导继续课程。 */
export function DrillPage({ language }: { language: Phase2Language }) {
  const c = useController();
  const { save } = useAppState();
  const { begin, dialog, error } = useTaskStarter();
  const categories = DRILL_CATEGORIES.filter((d) => d.language === language);

  const learnedIds = (category: DrillCategory): string[] => {
    switch (category) {
      case 'tricky-en':
        return trickyIds('en', save.phase2).filter((id) => save.phase2.learned[id]);
      case 'tricky-zh':
        return trickyIds('zh', save.phase2).filter((id) => save.phase2.learned[id]);
      default:
        return Object.keys(save.phase2.learned).filter((id) => {
          const item = phase2Item(id);
          if (!item || item.language !== language) return false;
          switch (category) {
            case 'uppercase':
              return item.tags.includes('uppercase');
            case 'space':
              return item.tags.includes('space');
            case 'punctuation':
              return item.tags.includes('punctuation');
            case 'selection':
              return item.tags.includes('selection');
            case 'polyphone':
              return item.tags.includes('polyphone');
            case 'umlaut':
              return item.tags.includes('umlaut');
            default:
              return false;
          }
        });
    }
  };

  return (
    <div className="page drills">
      <TopBar title={language === 'zh' ? '中文专项练习' : '英文专项练习'} onBack={() => c.go({ name: 'residents' })} backLabel="居民任务" />
      <div className="card drills__intro">
        <p>专项目录里只练已经学过的内容，每轮固定 {PHASE2_RULES.drill} 题，完成得 {PHASE2_RULES.rewards.repeat} 个灯光币。</p>
        <p className="hint-line">分类在对应内容第一次教学之后开放；还没有可练内容时会说明原因。</p>
      </div>
      {error && (
        <p className="notice-line" role="alert">
          {error}
        </p>
      )}

      <div className="drills__grid">
        {categories.map((d) => {
          const ids = learnedIds(d.id);
          const reason = drillLockReason(save, d.id);
          const locked = ids.length === 0 || reason !== '';
          return (
            <section key={d.id} className={`card drill-card${locked ? ' drill-card--locked' : ''}`} aria-labelledby={`drill-${d.id}`}>
              <h2 id={`drill-${d.id}`}>{d.name}</h2>
              <p className="hint-line">{d.description}</p>
              <p className="drill-card__count">{ids.length > 0 ? `可练内容 ${ids.length} 项` : '还没有可练的内容'}</p>
              {locked && <p className="lock-note">{reason || '先完成一个相关故事任务吧。'}</p>}
              {ids.length === 0 && reason === '' && <p className="lock-note">目前没有需要加强的内容。先完成一个相关故事任务吧。</p>}
              <button
                type="button"
                className={`btn btn--small${locked ? ' btn--locked' : ' btn--primary'}`}
                disabled={locked}
                onClick={() => begin({ kind: 'drill', language, category: d.id })}
              >
                {locked && <Icon name="lock" size={16} />}
                开始练习
              </button>
            </section>
          );
        })}
      </div>
      {dialog}
    </div>
  );
}
