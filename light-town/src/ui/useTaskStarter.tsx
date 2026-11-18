import { useState, type ReactNode } from 'react';
import { p2TaskTitle } from '../core/phase2/task';
import type { P2StartError, P2StartRequest } from '../core/phase2/task';
import { Dialog } from './components/Dialog';
import { useAppState, useController } from './hooks';

const P2_START_ERROR_TEXT: Record<P2StartError, string> = {
  'has-active-task': '还有一个任务没有完成。',
  'story-locked': '按顺序完成前面的故事任务后会开放。',
  'errand-locked': '完成这个语言的第一个故事任务后，居民委托就会开放。',
  'drill-locked': '完成对应的课程后，这里会开放。',
  'empty-pool': '先完成一个相关故事任务吧。',
};

export interface TaskStarter {
  begin: (req: P2StartRequest) => void;
  dialog: ReactNode;
  error: string | null;
}

/**
 * 第二阶段开始前的三选一：两阶段共用一个未完成任务槽，开始其他任务时明确提供
 * 「继续原任务 / 放弃并开始 / 取消」；切入口不自动放弃。
 */
export function useTaskStarter(): TaskStarter {
  const c = useController();
  const { save } = useAppState();
  const [pending, setPending] = useState<P2StartRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const slot = save.activeTask;

  const begin = (req: P2StartRequest): void => {
    setError(null);
    if (slot) {
      setPending(req);
      return;
    }
    const err = c.startP2(req);
    if (err) setError(err === 'empty-pool' ? '先完成一个相关故事任务吧。' : P2_START_ERROR_TEXT[err]);
  };

  const activeDesc = slot
    ? slot.variant === 'phase1'
      ? '第一阶段的关卡还没有完成。'
      : `「${slot.task.title}」已完成 ${slot.task.items.filter((o) => o.completed).length}/${slot.task.items.length} 题。`
    : '';

  const dialog =
    pending && slot ? (
      <Dialog
        title="还有一个任务没有完成"
        onClose={() => setPending(null)}
        actions={
          <>
            <button type="button" className="btn" data-autofocus onClick={() => setPending(null)}>
              取消
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const req = pending;
                setPending(null);
                const err = c.discardAndStartP2(req);
                if (err) setError(err === 'empty-pool' ? '先完成一个相关故事任务吧。' : P2_START_ERROR_TEXT[err]);
              }}
            >
              放弃并开始新的
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setPending(null);
                c.continueActive();
              }}
            >
              继续原任务
            </button>
          </>
        }
      >
        <p>
          {activeDesc}放弃的话，已完成的题不发奖励，但练习记录都保留。
        </p>
        <p className="hint-line">要开始的是：{p2TaskTitle(pending)}。</p>
      </Dialog>
    ) : null;

  return { begin, dialog, error };
}
