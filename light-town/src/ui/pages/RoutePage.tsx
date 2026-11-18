import { useState } from 'react';
import { COURSE_STAGES, keysForStage } from '../../config/keys';
import { modeLockReason, modeOpen } from '../../core/game';
import type { Mode } from '../../core/types';
import { TopBar } from '../components/Chrome';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { StageKeys } from '../components/StageKeys';
import { useAppState, useController } from '../hooks';
import { MODE_NAMES, keyCapName, keyList } from '../text';
import { useStarter } from '../useStarter';

const MODES: Mode[] = ['keys', 'strip', 'sign'];

/** P09 学习路线: practise any opened stage in any opened mode (never advances buildings). */
export function RoutePage() {
  const c = useController();
  const { save } = useAppState();
  const { begin, dialog, error } = useStarter();
  const [keysOf, setKeysOf] = useState<number | null>(null);
  const current = save.course.stage;

  return (
    <div className="page route-page">
      <TopBar title="学习路线" onBack={() => c.go({ name: 'town' })} backLabel="小镇" />
      <div className="card route-page__intro">
        <p>
          已学按键（{keysForStage(current).length} 个）：<span className="key-list">{keyList(keysForStage(current))}</span>
        </p>
        <p className="hint-line">
          在这里可以复习已开放的课程，不会点亮建筑，照常得到灯光币。当前阶的“逐键”和“灯带”完整关会计入学新按键的进度；单词关是奖励练习，不计入。
        </p>
        {save.course.allComplete && <p className="soft-note">全部按键课程已完成！</p>}
      </div>
      {error && (
        <p className="notice-line" role="alert">
          {error}
        </p>
      )}
      <ol className="stage-list">
        {COURSE_STAGES.map((st) => {
          const opened = st.stage <= current;
          const isCurrent = st.stage === current && !save.course.allComplete;
          const state = isCurrent ? '当前' : opened ? '已开放' : '待开放';
          return (
            <li key={st.stage} className={`stage-card${isCurrent ? ' stage-card--current' : ''}${opened ? '' : ' stage-card--locked'}`}>
              <div className="stage-card__head">
                <span className="stage-card__num">第 {st.stage} 阶</span>
                <span className={`badge${isCurrent ? ' badge--current' : opened ? ' badge--open' : ''}`}>
                  {!opened && <Icon name="lock" size={16} />}
                  {state}
                </span>
              </div>
              <p className="stage-card__keys">
                新按键：
                {st.newKeys.map((k) => (
                  <span key={k} className="keycap keycap--small">
                    {keyCapName(k)}
                  </span>
                ))}
              </p>
              {opened ? (
                <>
                  <p className="stage-card__tip">{st.tip}</p>
                  <div className="stage-card__modes">
                    {MODES.map((m) => {
                      const open = modeOpen(st.stage, m);
                      return (
                        <button
                          key={m}
                          type="button"
                          className={`btn btn--small${open ? '' : ' btn--locked'}`}
                          disabled={!open}
                          aria-describedby={open ? undefined : `lock-${st.stage}-${m}`}
                          onClick={() => begin({ entry: 'route', stage: st.stage, mode: m })}
                        >
                          {!open && <Icon name="lock" size={16} />}
                          {MODE_NAMES[m]}
                        </button>
                      );
                    })}
                    <button type="button" className="btn btn--small btn--ghost" onClick={() => setKeysOf(st.stage)}>
                      看按键位置
                    </button>
                  </div>
                  {MODES.filter((m) => !modeOpen(st.stage, m)).map((m) => (
                    <p key={m} id={`lock-${st.stage}-${m}`} className="lock-note">
                      {modeLockReason(st.stage, m)}
                    </p>
                  ))}
                </>
              ) : (
                <p className="lock-note">第 {st.stage - 1} 阶连续两关（逐键或灯带）准确率达到 90% 以后开放。</p>
              )}
            </li>
          );
        })}
      </ol>
      {keysOf !== null && (
        <Dialog
          title={`第 ${keysOf} 阶的新按键`}
          className="dialog--wide"
          onClose={() => setKeysOf(null)}
          actions={
            <button type="button" className="btn btn--primary" data-autofocus onClick={() => setKeysOf(null)}>
              知道了
            </button>
          }
        >
          <StageKeys stage={keysOf} />
        </Dialog>
      )}
      {dialog}
    </div>
  );
}
