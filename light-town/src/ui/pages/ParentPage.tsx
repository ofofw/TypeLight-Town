import { BUILDING_COUNT } from '../../config/buildings';
import { MAX_STAGE, SPACE } from '../../config/keys';
import { formatAccuracy } from '../../core/scoring';
import { formatFluency, recentPracticeComparison } from '../../core/phase2/stats';
import type { P2TaskKind } from '../../core/phase2/types';
import { lastDaysTotals, parentErrorKeys } from '../../core/stats';
import { formatDuration } from '../../core/time';
import { TopBar } from '../components/Chrome';
import { useAppState, useController } from '../hooks';
import { STORAGE_NOTES, keyCapName, stageNewKeysText } from '../text';
import { completedBuildings } from '../town';

const TABLE_KEYS = [...'abcdefghijklmnopqrstuvwxyz', SPACE];

/** P11 家长页 (no password by design). */
export function ParentPage({ from }: { from: 'home' | 'town' }) {
  const c = useController();
  const { save } = useAppState();
  const stats = save.stats;
  const week = lastDaysTotals(stats, Date.now(), 7);
  const errorKeys = parentErrorKeys(stats, 5);

  return (
    <div className="page parent">
      <TopBar title="家长页" onBack={() => c.go(from === 'home' ? { name: 'home' } : { name: 'town' })} backLabel={from === 'home' ? '首页' : '小镇'} />
      <p className="parent__statement" role="note">
        本游戏只记录按键是否按对，<strong>不能判断孩子实际使用了哪根手指</strong>。指法需要家长在旁边观察和提醒。
      </p>

      <div className="parent__grid">
        <section className="card" aria-labelledby="p-total">
          <h2 id="p-total">练习概况</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col"></th>
                <th scope="col">累计</th>
                <th scope="col">近 7 天</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">有效练习时长</th>
                <td>{formatDuration(stats.effectiveMs)}</td>
                <td>{formatDuration(week.effectiveMs)}</td>
              </tr>
              <tr>
                <th scope="row">有效尝试次数</th>
                <td>{stats.attempts}</td>
                <td>{week.attempts}</td>
              </tr>
              <tr>
                <th scope="row">准确率（总按对 ÷ 总尝试）</th>
                <td>{formatAccuracy(stats.correct, stats.attempts)}</td>
                <td>{formatAccuracy(week.correct, week.attempts)}</td>
              </tr>
              <tr>
                <th scope="row">完成关数</th>
                <td>{stats.levelsCompleted}</td>
                <td>{week.levels}</td>
              </tr>
            </tbody>
          </table>
          <p className="hint-line">“近 7 天”包括今天和之前 6 天（按这台设备的日期）。有效时长只计算练习进行中、且最近 15 秒内有按键的时间。</p>
        </section>

        <section className="card" aria-labelledby="p-course">
          <h2 id="p-course">课程进度</h2>
          <p>
            {save.course.allComplete
              ? `全部 ${MAX_STAGE} 阶按键课程已完成。`
              : `正在学第 ${save.course.stage} 阶（共 ${MAX_STAGE} 阶），这一阶的新按键：${stageNewKeysText(save.course.stage)}。`}
          </p>
          <p>
            小镇建筑：已点亮 {completedBuildings(save)}/{BUILDING_COUNT} 座。{save.festival.unlocked ? `灯光节已开放，完成 ${save.festival.roundsCompleted} 轮。` : ''}
          </p>
          <p className="hint-line">课程进度和建筑进度分开计算：建筑每完成一关就点亮一盏灯；新课程需要连续两关准确率达到 90% 才开放。完成课程不代表已经形成正确指法。</p>
        </section>

        <section className="card" aria-labelledby="p-errors">
          <h2 id="p-errors">最近容易按错的键</h2>
          {errorKeys.length === 0 ? (
            <p className="empty-state">练习后这里会显示记录。（某个键在最近 200 次尝试里至少出现 5 次，并且有按错时才会列出。）</p>
          ) : (
            <ol className="error-keys">
              {errorKeys.map((e) => (
                <li key={e.key}>
                  <span className="keycap keycap--small">{keyCapName(e.key)}</span>
                  按错 {e.errors} 次 / 共 {e.samples} 次（错误率 {Math.round(e.rate * 100)}%）
                </li>
              ))}
            </ol>
          )}
          <p className="hint-line">只统计最近 200 次尝试。按错时，错误算在当时应该按的那个键上。</p>
        </section>

        <section className="card parent__keys" aria-labelledby="p-keys">
          <h2 id="p-keys">26 个字母和空格</h2>
          <div className="table-scroll">
            <table className="data-table data-table--keys">
              <thead>
                <tr>
                  <th scope="col">按键</th>
                  <th scope="col">尝试</th>
                  <th scope="col">按对</th>
                  <th scope="col">准确率</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_KEYS.map((k) => {
                  const ks = stats.keys[k];
                  return (
                    <tr key={k}>
                      <th scope="row">{keyCapName(k)}</th>
                      <td>{ks?.attempts ?? 0}</td>
                      <td>{ks?.correct ?? 0}</td>
                      <td>{formatAccuracy(ks?.correct ?? 0, ks?.attempts ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card parent__storage" aria-labelledby="p-storage">
          <h2 id="p-storage">关于存档</h2>
          <ul className="plain-list">
            {STORAGE_NOTES.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>

        <ParentPhase2 />
      </div>
    </div>
  );
}

/** 家长页·第二阶段：分语言/任务类型统计与帮助使用说明（不与第一阶段逐键正确率混算）。 */
function ParentPhase2() {
  const { save } = useAppState();
  const data = save.phase2;
  const comparison = recentPracticeComparison(data, Date.now());
  const rows: { lang: 'zh' | 'en'; kind: P2TaskKind; label: string }[] = [];
  for (const lang of ['zh', 'en'] as const) {
    for (const [kind, label] of [['story', '故事任务'], ['errand', '居民委托'], ['drill', '专项练习']] as const) {
      rows.push({ lang, kind, label });
    }
  }
  return (
    <section className="card parent__p2" aria-labelledby="p-p2">
      <h2 id="p-p2">第二阶段（居民任务）</h2>
      <p className="hint-line">
        中英文分开统计；「首次正确率」的分母是有首次有效提交的题数，分子是首次提交就正确的题数——后来改对的不能算首次正确。
        「独立完成」按无帮助且首次正确的题数计。
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">语言 · 任务类型</th>
              <th scope="col">完成题数</th>
              <th scope="col">首次正确率</th>
              <th scope="col">独立完成</th>
              <th scope="col">错误提交次数</th>
              <th scope="col">编辑操作次数</th>
              <th scope="col">使用帮助题数</th>
              <th scope="col">正确完成字数</th>
              <th scope="col">有效时长</th>
              <th scope="col">流畅度</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ lang, kind, label }) => {
              const g = data.stats[`${lang}:${kind}`];
              const editsAvailable = g.editStatAvailable;
              return (
                <tr key={`${lang}:${kind}`}>
                  <th scope="row">
                    {lang === 'zh' ? '中文' : '英文'} · {label}
                  </th>
                  <td>{g.items}</td>
                  <td>
                    {formatAccuracy(g.firstCorrectItems, g.firstSubmittedItems)}
                    <span className="stat-list__sub">
                      {' '}{g.firstCorrectItems}/{g.firstSubmittedItems}
                    </span>
                  </td>
                  <td>{g.unaidedCorrectItems}</td>
                  <td>{g.wrongSubmissions}</td>
                  <td>{editsAvailable ? g.editOperations : '—'}</td>
                  <td>{g.helpItems}</td>
                  <td>{g.targetChars}</td>
                  <td>{formatDuration(g.effectiveMs)}</td>
                  <td>{formatFluency(g.targetChars, g.effectiveMs)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="hint-line">
        编辑操作指删除或替换已输入文本的次数（组字选字过程不计）。流畅度为正确完成字符数 ÷ 有效分钟；中英文不合并比较；无数据显示“—”。
      </p>

      <h3>最近表现</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col">有练习日</th>
            <th scope="col">完成题数</th>
            <th scope="col">有效时长</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">最近 7 个有练习日</th>
            <td>{comparison.current.days}</td>
            <td>{comparison.current.items}</td>
            <td>{formatDuration(comparison.current.effectiveMs)}</td>
          </tr>
          <tr>
            <th scope="row">此前 7 个有练习日</th>
            {comparison.previous ? (
              <>
                <td>{comparison.previous.days}</td>
                <td>{comparison.previous.items}</td>
                <td>{formatDuration(comparison.previous.effectiveMs)}</td>
              </>
            ) : (
              <td colSpan={3}>还没有足够的历史（需要再往前有 7 个练习日才显示比较）</td>
            )}
          </tr>
        </tbody>
      </table>
      <p className="hint-line">只按有练习的日子统计，不做天数平均；不足两组时只显示当前值。这些记录不能说明孩子“已经熟练”。</p>

      <h3>帮助使用说明</h3>
      <ul className="plain-list">
        <li>「使用帮助题数」包括主动点开帮助，以及第 2、3 级错误提示出现的题；同一题多次求助只算一次。</li>
        <li>中文题始终显示拼音和释义，这些常驻提示不算求助。</li>
        <li>帮助不影响完成或奖励；只是给家长的参考。</li>
      </ul>
    </section>
  );
}
