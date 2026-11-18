import { PHASE2_ITEMS } from '../../config/phase2/content';
import { PHASE2_RULES } from '../../config/phase2/rules';
import { localDateKey } from '../../core/time';
import { STORAGE_NOTES } from '../text';
import { TopBar } from '../components/Chrome';
import { Icon } from '../components/Icon';
import { useAppState, useController } from '../hooks';

/** P02b 居民任务首页：英文/中文两张路线卡、故事、居民委托、专项入口、每日小目标打卡。 */
export function ResidentsPage() {
  const c = useController();
  const { save } = useAppState();
  const slot = save.activeTask;
  const p2 = slot && slot.variant === 'phase2' ? slot.task : null;
  const doneZh = save.phase2.storyDone.filter((id) => id.startsWith('zh-')).length;
  const doneEn = save.phase2.storyDone.filter((id) => id.startsWith('en-')).length;
  const errandOpen = (lang: 'zh' | 'en') => save.phase2.storyDone.some((id) => id.startsWith(`${lang}-`));

  // 每日小目标（2026-11-17）：今天是否已完成任意 1 个任务；连击只展示、断签不惩罚。
  const todayKey = localDateKey(Date.now());
  const yesterdayKey = localDateKey(Date.now() - PHASE2_RULES.dayMs);
  const bonus = save.phase2.dailyBonus;
  const doneToday = bonus?.lastDate === todayKey;
  // 有效连击：今天完成 → streakDays；昨天完成（今天还没玩）→ streakDays（今天完成还能续上）；更早 → 归零显示。
  const streak = doneToday || bonus?.lastDate === yesterdayKey ? (bonus?.streakDays ?? 0) : 0;
  const learnedCount = PHASE2_ITEMS.filter((i) => save.phase2.learned[i.id]).length;

  return (
    <div className="page residents">
      <TopBar title="居民任务" onBack={() => c.go({ name: 'town' })} backLabel="小镇" />

      {p2 && (
        <div className="resume-banner" role="status">
          <span>
            有一个任务还没完成：{p2.title}（{p2.items.filter((o) => o.completed).length}/{p2.items.length}）
          </span>
          <span className="resume-banner__actions">
            <button type="button" className="btn btn--primary" onClick={() => c.continueActive()}>
              继续练习
            </button>
          </span>
        </div>
      )}

      <div className="card residents__daily" role="status">
        {doneToday ? (
          <p>
            <Icon name="check" size={20} /> 今日小目标完成啦！已经连续 <strong>{streak}</strong> 天。明天也来玩一个吧。
          </p>
        ) : (
          <p>
            今日小目标：完成任意 1 个任务，额外得到 <strong>{PHASE2_RULES.rewards.dailyBonus}</strong> 个灯光币。
            {streak > 0 && `你已经连续 ${streak} 天啦，今天也别断掉哦。`}
          </p>
        )}
      </div>

      <div className="residents__routes">
        {(['en', 'zh'] as const).map((lang) => (
          <section key={lang} className="card residents__route-card">
            <div className="residents__route-head">
              <span className={`chip chip--lang ${lang === 'zh' ? 'chip--zh' : 'chip--en'}`}>{lang === 'zh' ? '中文' : '英文'}</span>
              <h2>{lang === 'zh' ? '中文路线' : '英文路线'}</h2>
              <span className="residents__count">{lang === 'zh' ? doneZh : doneEn}/36</span>
            </div>
            <p className="hint-line">
              {lang === 'zh' ? '先练单个字和选字，再练词语、多音字和 ü。' : '先练基础单词，再练短句、大小写和标点。'}
            </p>
            <div className="residents__actions">
              <button type="button" className="btn btn--primary" onClick={() => c.go({ name: 'residents-route', language: lang })}>
                <Icon name="route" size={22} />
                故事任务
              </button>
            </div>
            <div className="residents__extras">
              <button
                type="button"
                className={`btn btn--small${errandOpen(lang) ? '' : ' btn--locked'}`}
                onClick={() => c.go({ name: 'task-preview', req: { kind: 'errand', language: lang } })}
              >
                {!errandOpen(lang) && <Icon name="lock" size={16} />}
                居民委托
              </button>
              <button type="button" className="btn btn--small" onClick={() => c.go({ name: 'drills', language: lang })}>
                专项练习
              </button>
            </div>
            {!errandOpen(lang) && <p className="lock-note">完成这个语言的第一个故事任务后，居民委托就会开放。</p>}
          </section>
        ))}
      </div>

      <div className="residents__album">
        <button type="button" className="btn btn--large btn--block" onClick={() => c.go({ name: 'album' })}>
          <Icon name="star" size={22} />
          字词图鉴（已收集 {learnedCount}/{PHASE2_ITEMS.length}）
        </button>
      </div>

      <div className="residents__footer">
        <p className="hint-line">中英文分开练习、进度分开；故事任务随时可以重玩。委托和专项只练已经学过的内容。</p>
        <details className="residents__notes">
          <summary>进度保存在哪里？</summary>
          <ul className="plain-list">
            {STORAGE_NOTES.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
