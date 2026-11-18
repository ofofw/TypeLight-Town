import { useState } from 'react';
import { phase2Item, type Phase2Language } from '../../config/phase2/content';
import { phase2TasksOf } from '../../config/phase2/content';
import { buildName } from '../text';
import { maxUnlockedSequence } from '../../core/phase2/task';
import { TopBar } from '../components/Chrome';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { useAppState, useController } from '../hooks';
import { useTaskStarter } from '../useTaskStarter';

const STEP_NAMES = ['第 1 步 · 初次帮忙', '第 2 步 · 合作准备', '第 3 步 · 独立交付'];

/** P03b 语言路线页：三步分区、任务卡、建筑名、顺序、完成状态、推荐下一任务。 */
export function ResidentsRoutePage({ language }: { language: Phase2Language }) {
  const c = useController();
  const { save } = useAppState();
  const { begin, dialog, error } = useTaskStarter();
  const [peek, setPeek] = useState<string | null>(null);
  const tasks = phase2TasksOf(language);
  const unlockedMax = maxUnlockedSequence(language, save.phase2.storyDone);
  const nextTask = tasks.find((t) => !save.phase2.storyDone.includes(t.id));
  const doneCount = save.phase2.storyDone.filter((id) => (language === 'zh' ? id.startsWith('zh-') : id.startsWith('en-'))).length;
  const allDone = doneCount >= 36;

  return (
    <div className="page residents-route">
      <TopBar title={language === 'zh' ? '中文故事任务' : '英文故事任务'} onBack={() => c.go({ name: 'residents' })} backLabel="居民任务" />

      <div className="card residents-route__intro">
        <p>
          {allDone
            ? '这条路线的 36 个故事全部完成！可以随时重玩，不会宣称“已经熟练”——多练才会更稳。'
            : `已完成 ${doneCount}/36。推荐下一个：${nextTask ? nextTask.title : ''}（${nextTask ? buildName(nextTask.buildingId) : ''}）。`}
        </p>
        <p className="hint-line">任务按顺序开放，已完成可以重玩；未点亮的建筑也可以接任务，生活小改动不会改变小镇的永久灯光。</p>
      </div>
      {error && (
        <p className="notice-line" role="alert">
          {error}
        </p>
      )}

      {[1, 2, 3].map((step) => (
        <section key={step} className="residents-route__step" aria-label={STEP_NAMES[step - 1]}>
          <h2 className="residents-route__step-title">{STEP_NAMES[step - 1]}</h2>
          <ol className="task-list">
            {tasks
              .filter((t) => t.step === step)
              .map((t) => {
                const done = save.phase2.storyDone.includes(t.id);
                const unlocked = t.sequence <= unlockedMax;
                const isNext = nextTask?.id === t.id;
                return (
                  <li
                    key={t.id}
                    className={`task-card${done ? ' task-card--done' : ''}${isNext ? ' task-card--next' : ''}${unlocked ? '' : ' task-card--locked'}`}
                  >
                    <div className="task-card__head">
                      <span className="task-card__seq">{t.sequence}</span>
                      <div className="task-card__names">
                        <span className="task-card__title">{t.title}</span>
                        <span className="task-card__building">{buildName(t.buildingId)}</span>
                      </div>
                      <span className={`badge${done ? ' badge--open' : isNext ? ' badge--current' : ''}`}>
                        {done ? (
                          <>
                            <Icon name="check" size={16} /> 已完成 · 可重玩
                          </>
                        ) : isNext ? (
                          '推荐下一项'
                        ) : unlocked ? (
                          '可开始'
                        ) : (
                          <>
                            <Icon name="lock" size={16} /> 待开放
                          </>
                        )}
                      </span>
                    </div>
                    <div className="task-card__body">
                      <div className="task-card__targets">
                        {t.focusItemIds.slice(0, 6).map((id) => (
                          <span key={id} className="chip">
                            {peekId(id, language)}
                          </span>
                        ))}
                      </div>
                      <div className="task-card__actions">
                        <button type="button" className="btn btn--small btn--ghost" onClick={() => setPeek(t.id)}>
                          看目标
                        </button>
                        {unlocked && (
                          <button
                            type="button"
                            className={`btn btn--small${isNext ? ' btn--primary' : ''}`}
                            onClick={() =>
                              isNext
                                ? c.go({ name: 'task-preview', req: { kind: 'story', taskId: t.id } })
                                : begin({ kind: 'story', taskId: t.id })
                            }
                          >
                            {isNext ? '看这个任务' : done ? '重玩' : '开始'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
          </ol>
        </section>
      ))}

      {peek && (
        <Dialog
          title={tasks.find((t) => t.id === peek)?.title ?? ''}
          onClose={() => setPeek(null)}
          actions={
            <button type="button" className="btn btn--primary" data-autofocus onClick={() => setPeek(null)}>
              知道了
            </button>
          }
        >
          <TaskPeek language={language} taskId={peek} />
        </Dialog>
      )}
      {dialog}
    </div>
  );
}

function peekId(id: string, _language: Phase2Language): string {
  return phase2Item(id)?.target ?? id;
}

function TaskPeek({ language, taskId }: { language: Phase2Language; taskId: string }) {
  const t = phase2TasksOf(language).find((x) => x.id === taskId);
  if (!t) return null;
  return (
    <div>
      <p>
        {buildName(t.buildingId)} · {t.steps.map((s) => s.title).join(' → ')}
      </p>
      <p className="hint-line">固定 {t.targetCount} 题；每步 {t.steps.map((s) => s.targetCount).join('、')} 题。开始后不加题。</p>
      <p className="task-peek__focus">练习目标：{t.focusItemIds.map((id) => phase2Item(id)?.target).filter(Boolean).join('、')}</p>
      <p className="task-peek__review">
        {t.reviewItemIds.length > 0 ? `复习：${t.reviewItemIds.map((id) => phase2Item(id)?.target).filter(Boolean).slice(0, 8).join('、')}${t.reviewItemIds.length > 8 ? ' 等' : ''}` : '本任务没有复习池，全部练习重点内容。'}
      </p>
      {t.sequence > 1 && (
        <p className="hint-line">要开始的话，先确认没有别的任务在进行；有旧任务会先问你“继续 / 放弃并开始 / 取消”。</p>
      )}
    </div>
  );
}
