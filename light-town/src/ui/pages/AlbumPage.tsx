import { PHASE2_BUILDING_ORDER, PHASE2_ITEMS, buildingOfItem, phase2Item } from '../../config/phase2/content';
import { TopBar } from '../components/Chrome';
import { Icon } from '../components/Icon';
import { useAppState, useController } from '../hooks';
import { buildName } from '../text';

/**
 * P13b 字词图鉴（2026-11-17 新增，纯派生）：学过的词句点亮图鉴卡，按建筑分组，
 * 显示收集进度；集齐一座建筑的词组获得一枚小星星。数据来自 phase2.learned，不进存档。
 */
export function AlbumPage() {
  const c = useController();
  const { save } = useAppState();
  const learnedCount = PHASE2_ITEMS.filter((i) => save.phase2.learned[i.id]).length;
  const total = PHASE2_ITEMS.length;
  const percent = Math.round((learnedCount / total) * 100);

  return (
    <div className="page album">
      <TopBar title="字词图鉴" onBack={() => c.go({ name: 'residents' })} backLabel="居民任务" />

      <div className="card album__overview">
        <h2>
          已收集 {learnedCount}/{total}
        </h2>
        <div
          className="goal-card__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={learnedCount}
          aria-label="字词图鉴收集进度"
        >
          <div className="goal-card__fill" style={{ width: `${percent}%` }} />
          <span className="goal-card__count">{percent}%</span>
        </div>
        <p className="hint-line">每正确完成一道题，这张词句卡就会在图鉴里点亮。集齐一座建筑的词组，就能得到一颗小星星。</p>
      </div>

      {PHASE2_BUILDING_ORDER.map((buildingId) => {
        const items = PHASE2_ITEMS.filter((i) => buildingOfItem(i.id) === buildingId);
        if (items.length === 0) return null;
        const done = items.filter((i) => save.phase2.learned[i.id]).length;
        const complete = done === items.length;
        return (
          <section key={buildingId} className="card album__group" aria-label={`${buildName(buildingId)}的词句`}>
            <div className="album__group-head">
              <h2>{buildName(buildingId)}</h2>
              <span className={`badge${complete ? ' badge--open' : ''}`}>
                {complete ? (
                  <>
                    <Icon name="star" size={16} /> 集齐啦
                  </>
                ) : (
                  `${done}/${items.length}`
                )}
              </span>
            </div>
            <ul className="album__chips">
              {items.map((item) => {
                const learned = Boolean(save.phase2.learned[item.id]);
                return (
                  <li key={item.id}>
                    <span
                      className={`chip chip--lang ${item.language === 'zh' ? 'chip--zh' : 'chip--en'}${learned ? ' album__chip--learned' : ' album__chip--unknown'}`}
                      title={learned ? `${phase2Item(item.id)?.pinyin ?? ''}（${item.meaning}）` : '还没有学会'}
                    >
                      {learned ? item.target : '？'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
