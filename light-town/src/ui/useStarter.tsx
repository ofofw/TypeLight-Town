import { useState, type ReactNode } from 'react';
import type { StartError, StartRequest } from '../core/game';
import { p1Level } from '../core/game';
import { Dialog } from './components/Dialog';
import { useAppState, useController } from './hooks';
import { levelHeading } from './text';

const START_ERROR_TEXT: Record<StartError, string> = {
  'has-active-level': '还有一关没有完成。',
  'all-buildings-done': '12 座建筑已经全部点亮了，可以“继续学习”或去灯光节。',
  'buildings-remaining': '还有建筑没点亮，先“继续点亮”吧。',
  'stage-locked': '这一阶课程还没开放。',
  'mode-locked': '这个玩法还没开放。',
  'building-locked': '这座建筑还没点亮，暂时不能重练。',
  'festival-locked': '灯光节在 12 座建筑全部点亮后开放。',
  'keys-invalid': '请至少选 2 个已经学过的按键。',
};

/**
 * Starting a level from a menu: when an unfinished level exists, ask "继续上次 / 放弃并开始新的" first.
 */
export function useStarter(): { begin: (req: StartRequest) => void; dialog: ReactNode; error: string | null } {
  const c = useController();
  const { save } = useAppState();
  const [pending, setPending] = useState<StartRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = p1Level(save);

  const begin = (req: StartRequest) => {
    setError(null);
    if (active) {
      setPending(req);
      return;
    }
    const err = c.start(req);
    if (err) setError(START_ERROR_TEXT[err]);
  };

  const dialog =
    pending && active ? (
      <Dialog
        title="还有一关没有完成"
        onClose={() => setPending(null)}
        actions={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const req = pending;
                setPending(null);
                const err = c.discardAndStart(req);
                if (err) setError(START_ERROR_TEXT[err]);
              }}
            >
              放弃并开始新的
            </button>
            <button
              type="button"
              className="btn btn--primary"
              data-autofocus
              onClick={() => {
                setPending(null);
                c.continueActive();
              }}
            >
              继续上次
            </button>
          </>
        }
      >
        <p>
          {levelHeading(active)}：已完成 {active.pos}/{active.targets.length}。放弃后，已经按过的记录会保留，但这一关不发奖励。
        </p>
      </Dialog>
    ) : null;

  return { begin, dialog, error };
}
