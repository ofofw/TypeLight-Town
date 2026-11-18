import { PlayerIdentity } from '../components/PlayerIdentity';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { LifeEffect, LifeScene } from '../../art/phase2/LifeScene';
import { PartnerArt } from '../../art/partners';
import type { PartnerPose } from '../../art/types';
import type { Phase2Item } from '../../config/phase2/content';
import { phase2Item, phase2Task } from '../../config/phase2/content';
import { PHASE2_RULES } from '../../config/phase2/rules';
import { VOICE_LINES_P2 } from '../../config/phase2/voice';
import { SubmitGate } from '../../core/phase2/ime';
import { currentOccurrence, currentStep, stepDone, taskDone } from '../../core/phase2/task';
import type { P2TaskState } from '../../core/phase2/types';
import type { SaveData } from '../../core/types';
import { SoundButton } from '../components/Chrome';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { useAnimate, useAppState, useController } from '../hooks';
import { buildName } from '../text';

type Overlay =
  | { kind: 'guide'; index: 1 | 2 | 3 }
  | { kind: 'intro' }
  | { kind: 'teaching'; key: string }
  | { kind: 'ready'; reason: 'start' | 'resume' | 'idle' | 'away' }
  | { kind: 'help' }
  | { kind: 'menu' }
  | { kind: 'restart' }
  | { kind: 'step-done' }
  | null;

const GUIDE_CARDS: { title: string; text: string; voice: keyof typeof VOICE_LINES_P2 }[] = [
  { title: '先坐好', text: VOICE_LINES_P2.p2Intro1, voice: 'p2Intro1' },
  { title: '选好输入法', text: VOICE_LINES_P2.p2Intro2, voice: 'p2Intro2' },
  { title: '输入并确认', text: VOICE_LINES_P2.p2Intro3, voice: 'p2Intro3' },
];

/** 需要为当前题展示的教学卡（首次）。 */
function teachingKeyFor(item: Phase2Item | null, language: 'zh' | 'en'): string | null {
  if (!item) return null;
  if (language === 'zh') {
    if (item.tags.includes('umlaut')) return 'zh:umlaut';
    if (item.tags.includes('polyphone')) return 'zh:polyphone';
    if (item.tags.includes('selection')) return 'zh:selection';
    return null;
  }
  if (item.tags.includes('uppercase')) return 'en:uppercase';
  if (item.tags.includes('punctuation')) return 'en:punctuation';
  if (item.tags.includes('space')) return 'en:space';
  return null;
}

const TEACHING_CONTENT: Record<string, { title: string; lines: (keyof typeof VOICE_LINES_P2)[] }> = {
  'zh:selection': { title: '中文：选字', lines: ['p2Select', 'p2Paging'] },
  'zh:polyphone': { title: '多音字', lines: ['p2Polyphone'] },
  'zh:umlaut': { title: 'ü 怎么打', lines: ['p2Umlaut'] },
  'en:uppercase': { title: '大写字母', lines: ['p2Uppercase'] },
  'en:punctuation': { title: '英文标点', lines: ['p2Period', 'p2Question'] },
  'en:space': { title: '空格', lines: ['p2Space'] },
};

/** P05b 第二阶段练习页：真实输入框 + 系统输入法，Enter/确认门控。 */
export function TaskPracticePage({ autoStart }: { autoStart: boolean }) {
  const c = useController();
  const { save } = useAppState();
  const slot = save.activeTask;
  const task = slot && slot.variant === 'phase2' ? slot.task : null;
  useEffect(() => {
    if (!task) c.go({ name: 'residents' });
  }, [c, task]);
  if (!task) return null;
  void autoStart;
  return <TaskSession key={task.instanceId} task={task} save={save} />;
}

const Visual = memo(function Visual(props: {
  task: P2TaskState;
  buildingStage: number;
  theme: SaveData['theme'];
  animate: boolean;
}) {
  const { task, buildingStage, theme, animate } = props;
  const story = task.kind === 'story' ? phase2Task(task.sourceId) : null;
  const step = currentStep(task);
  return (
    <figure className="practice__visual">
      <LifeScene
        buildingId={task.buildingId}
        step={story ? step : 0}
        count={story ? stepDone(task, step) : taskDone(task)}
        total={story ? task.stepCounts[step] ?? 0 : task.items.length}
        language={task.language}
        theme={theme}
        buildingStage={buildingStage}
        animate={animate}
        title={`${buildName(task.buildingId)}，第 ${step + 1}/3 步`}
        className="life-scene--practice"
      />
      <figcaption>
        {task.kind === 'story' ? (
          <>
            {task.title}
            <br />
            <span className="hint-line">{story?.steps[step]?.prompt ?? ''}</span>
          </>
        ) : (
          <>
            {task.title}
            <br />
            <span className="hint-line">这一轮不会改变建筑灯光，完成后得到灯光币。</span>
          </>
        )}
      </figcaption>
    </figure>
  );
});

function TaskSession({ task, save }: { task: P2TaskState; save: SaveData }) {
  const c = useController();
  const animate = useAnimate();
  const gateRef = useRef(new SubmitGate());
  const inputRef = useRef<HTMLInputElement>(null);
  /**
   * 本页自己发起的暂停（教学卡/菜单）伴随一次排队中的覆盖层。ref 立即可见、不受 React 更新通道影响：
   * 外部暂停效果据此跳过一拍，等自己的覆盖层渲染出来，避免"离开页面"面板把自己的对话框顶掉。
   */
  const selfOverlay = useRef(false);
  const generation = useRef(c.getState().generation).current;
  const draftTimer = useRef<number | null>(null);
  const editOps = useRef(0);
  const [overlay, setOverlay] = useState<Overlay>(() => {
    if (!task.introSeen) return save.phase2.teaching['intro'] ? { kind: 'intro' } : { kind: 'guide', index: 1 };
    if (task.paused) return { kind: 'ready', reason: task.items.some((o) => o.completed) ? 'resume' : 'start' };
    return null;
  });
  const [value, setValue] = useState(() => currentOccurrence(task)?.occ.draft ?? '');
  const [notice, setNotice] = useState<string | null>(null);
  const [diffShown, setDiffShown] = useState(false);
  const cur = currentOccurrence(task);
  const occ = cur?.occ ?? null;
  const item = occ ? phase2Item(occ.targetId) ?? null : null;
  const active = !task.paused && overlay === null;
  const playVoice = useCallback((id: string) => c.audio.playP2Voice(id), [c]);

  const flushDraft = useCallback(() => {
    if (draftTimer.current !== null) {
      window.clearTimeout(draftTimer.current);
      draftTimer.current = null;
    }
    if (occ && c.getState().generation === generation) c.saveP2Draft(occ.occurrenceId, value);
  }, [c, occ, value]);

  useEffect(() => {
    const flush = () => { if (!occ?.compositionActive) flushDraft(); };
    window.addEventListener('lighttown:flush-draft', flush);
    return () => window.removeEventListener('lighttown:flush-draft', flush);
  }, [flushDraft]);

  const scheduleDraft = useCallback(() => {
    if (draftTimer.current !== null) window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      draftTimer.current = null;
      if (occ && c.getState().generation === generation) c.saveP2Draft(occ.occurrenceId, inputRef.current?.value ?? value);
    }, PHASE2_RULES.draftSaveDebounceMs);
  }, [c, occ, value]);

  useEffect(() => () => {
    if (draftTimer.current !== null) window.clearTimeout(draftTimer.current);
  }, []);

  // 切题：清空输入与差异显示，恢复已保存的 draft（新题一般为空），播读音。
  useEffect(() => {
    setValue(occ?.draft ?? '');
    setDiffShown(false);
    editOps.current = 0;
    if (occ?.compositionActive) {
      setNotice('上一次的拼音候选没有保存，请重新输入。');
    }
    if (item?.language === 'zh' && item.voiceText && active) playVoice(item.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occ?.occurrenceId]);

  // 首次遇到对应内容时展示教学卡（每个只展示一次；展示时暂停，避免打断输入）。
  // 覆盖层先排队、selfOverlay 立即置位，再暂停：暂停触发的同步重渲染即使暂时看不到
  // 教学卡，外部暂停效果也会因 selfOverlay 跳过，不会用恢复面板把教学卡顶掉。
  useEffect(() => {
    if (!active || !occ) return;
    const key = teachingKeyFor(item, task.language);
    if (key && !save.phase2.teaching[key]) {
      setOverlay({ kind: 'teaching', key });
      selfOverlay.current = true;
      c.pause();
      c.markP2Teaching(key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, occ?.occurrenceId]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  // 自动暂停检测（组字期间不暂停，见 controller.tickPractice）。
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      if (c.tickPractice()) setOverlay({ kind: 'ready', reason: 'idle' });
    }, 1000);
    return () => clearInterval(id);
  }, [active, c]);

  // 外部暂停（切后台/失焦/失去租约）。
  // 暂停而面板缺失 = 输入框禁用且无处可点（表现为"无法输入"）：除非这是自己刚发起的
  // 暂停且覆盖层正在排队（selfOverlay），否则必须显示恢复面板——不允许静默吞没。
  useEffect(() => {
    const current = c.getState().save.activeTask;
    const t = current && current.variant === 'phase2' ? current.task : null;
    if (t?.paused && overlay === null) {
      if (selfOverlay.current) return;
      flushDraft();
      setOverlay({ kind: 'ready', reason: 'away' });
    }
  }, [c, task.paused, overlay, flushDraft]);

  const startPlaying = () => {
    if (!task.introSeen) return;
    selfOverlay.current = false;
    // 暂停中→恢复；未暂停（帮助/步骤完成页之后）→刷新空闲计时，避免点「继续」立刻又被暂停。
    c.touchP2Activity();
    setOverlay(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const beginIntro = () => {
    c.confirmP2Intro();
    if (!save.phase2.teaching['intro']) c.markP2Teaching('intro');
    setOverlay({ kind: 'ready', reason: 'start' });
  };

  const afterTeaching = () => {
    // 教学卡展示期间任务已暂停；确认后直接恢复练习。
    selfOverlay.current = false;
    setOverlay(null);
    c.touchP2Activity();
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const doSubmit = () => {
    if (!occ || occ.completed) return;
    const text = inputRef.current?.value ?? value;
    const r = c.submitP2Text(text);
    switch (r.kind) {
      case 'empty':
        setNotice(`先输入内容。照着上面的目标打字就好。`);
        break;
      case 'mismatch':
        setDiffShown(true);
        setNotice(r.firstSubmission ? '再看一眼标出的地方，改好后确认。' : '还没有对上，试试按提示改一改。');
        if (r.pinyinHint) playVoice('p2Select');
        break;
      case 'match':
        setNotice(null);
        setDiffShown(false);
        if (r.stepCompleted) setOverlay({ kind: 'step-done' });
        break;
      default:
        break;
    }
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  /* ---------------- input events ---------------- */

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const gate = gateRef.current;
    const verdict = gate.onEnterKeydown({ isComposing: e.nativeEvent.isComposing, keyCode: e.nativeEvent.keyCode, repeat: e.nativeEvent.repeat });
    if (verdict === 'submit') {
      e.preventDefault();
      doSubmit();
    } else if (verdict === 'block' && gate.isComposing()) {
      setNotice('正在选字，先选出汉字，再按一次 Enter 或点确认。');
    } else if (verdict === 'block') {
      setNotice(VOICE_LINES_P2.p2ConfirmIme);
    }
  };

  const onInputKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') gateRef.current.onEnterKeyup();
  };

  const onCompositionStart = (e: React.CompositionEvent<HTMLInputElement>) => {
    gateRef.current.onCompositionStart();
    if (occ) c.setP2Composition(occ.occurrenceId, true);
    void e;
  };

  const onCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    gateRef.current.onCompositionEnd();
    if (occ) c.setP2Composition(occ.occurrenceId, false);
    setValue(e.currentTarget.value);
    scheduleDraft();
  };

  /** 编辑操作计数：非组字的删除/替换记 1，单纯新增记 0；多字符一次删除仍为 1。 */
  const onBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
    const ev = e.nativeEvent as InputEvent;
    if (ev.isComposing) return;
    const t = 'inputType' in ev ? (ev as InputEvent).inputType : '';
    if (t.startsWith('delete')) {
      editOps.current += 1;
      return;
    }
    if (t === 'insertText' || t === 'insertLineBreak' || t === 'historyUndo' || t === 'historyRedo') {
      const el = e.currentTarget;
      if (el.selectionStart !== null && el.selectionEnd !== null && el.selectionEnd > el.selectionStart) {
        editOps.current += 1; // 替换已有文本
      }
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setNotice(VOICE_LINES_P2.p2Paste);
    playVoice('p2Paste');
  };

  const confirmPointerDown = () => {
    const r = gateRef.current.onConfirmPointerdown();
    if (r === 'guard') setNotice(VOICE_LINES_P2.p2ConfirmIme);
  };

  const confirmClick = () => {
    const r = gateRef.current.onConfirmClick();
    if (r === 'submit') doSubmit();
    else setNotice(VOICE_LINES_P2.p2ConfirmIme);
  };

  const openMenu = () => {
    setOverlay({ kind: 'menu' });
    selfOverlay.current = true;
    flushDraft();
    c.pause();
  };

  const openHelp = () => {
    c.markP2Help();
    playVoice('p2Select');
    setOverlay({ kind: 'help' });
  };

  /* ---------------- derived display ---------------- */

  const step = currentStep(task);
  const done = taskDone(task);
  const wrongs = occ?.wrongSubmissions ?? 0;
  const level = wrongs >= 3 ? 3 : wrongs >= 2 ? 2 : wrongs >= 1 ? 1 : 0;
  const pose: PartnerPose = level > 0 ? 'guide' : 'idle';
  const isZh = task.language === 'zh';
  const target = item?.target ?? '';

  // 英文按键提示：大写、句号、问号、空格（按当前目标内容）。
  const enHints: string[] = [];
  if (item && !isZh) {
    if (item.tags.includes('uppercase')) {
      const uppers = [...target].filter((ch) => /[A-Z]/.test(ch));
      if (uppers.length > 0) enHints.push(`按住 Shift 再按 ${uppers.join('、')}，然后松开`);
    }
    if (target.includes('.')) enHints.push('句号就是键盘上的 . 键');
    if (target.includes('?')) enHints.push('问号在大多数键盘上是按住 Shift 再按 /（按你的键盘布局找 ?）');
    if (item.tags.includes('space')) enHints.push('两个单词之间按一次空格');
  }
  // 分段引导（第 3 级）：只显示目标开头片段，不代填。
  const segment = level >= 3 ? [...target].slice(0, isZh ? 2 : 4).join('') : null;
  const pinyinSyllables = isZh && item?.pinyin ? item.pinyin.split(' ') : [];

  return (
    <div className="page task-practice">
      <header className="topbar topbar--practice">
        <h1 className="topbar__title">{task.title}</h1>
        <div className="topbar__actions">
          <span className="task-progress" aria-live="polite">
            {task.kind === 'story' && `第 ${step + 1}/3 步 · `}题 {done + (cur ? 1 : 0)}/{task.items.length}
          </span>
          <button type="button" className="icon-btn" onClick={openMenu}>
            <Icon name="pause" />
            <span className="icon-btn__label">暂停</span>
          </button>
          <SoundButton />
        </div>
      </header>

      <div className="practice__layout">
        <Visual task={task} buildingStage={save.buildings[buildingIndexOf(task.buildingId)] ?? 0} theme={save.theme} animate={animate} />

        <section className="practice__main" aria-label="练习区">
          <div className="task-progressbar" role="progressbar" aria-valuemin={0} aria-valuemax={task.items.length} aria-valuenow={done} aria-label={`本任务进度 ${done}/${task.items.length}`}>
            <div className="task-progressbar__fill" style={{ width: `${(done / Math.max(1, task.items.length)) * 100}%` }} />
          </div>

          {item && (
            <div className="task-target" aria-label="当前目标">
              {isZh ? (
                <div className="task-target__zh">
                  <span className="task-target__pinyin">
                    {[...target].map((_, i) => (
                      <span key={i} className="task-target__py-cell">{pinyinSyllables[i] ?? ''}</span>
                    ))}
                  </span>
                  <span className="task-target__chars">
                    {[...target].map((ch, i) => (
                      <span key={i} className="task-target__char">{ch}</span>
                    ))}
                  </span>
                </div>
              ) : (
                <div className="task-target__en">
                  {[...target].map((ch, i) =>
                    ch === ' ' ? (
                      <span key={i} className="target-char target-char--space" aria-label="空格">
                        <span className="space-symbol" />
                        <span className="space-word">空格</span>
                      </span>
                    ) : (
                      <span key={i} className={`task-target__latin${/[A-Z]/.test(ch) ? ' task-target__latin--upper' : ''}`}>{ch}</span>
                    ),
                  )}
                </div>
              )}
              <div className="task-target__meta">
                <span className="task-target__meaning">{item.meaning}</span>
                {isZh && (
                  <button type="button" className="btn btn--small" onClick={() => playVoice(item.id)} aria-label={`朗读 ${item.target}`}>
                    <Icon name="sound" size={18} />
                    读一读
                  </button>
                )}
              </div>
              {enHints.length > 0 && <p className="hint-line">{enHints.join('；')}。</p>}
            </div>
          )}

          <div className="task-input-row">
            <input
              ref={inputRef}
              className="task-input"
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.currentTarget.value);
                scheduleDraft();
              }}
              onKeyDown={onInputKeyDown}
              onKeyUp={onInputKeyUp}
              onCompositionStart={onCompositionStart}
              onCompositionEnd={onCompositionEnd}
              onBeforeInput={onBeforeInput}
              onPaste={onPaste}
              onBlur={() => {
                flushDraft();
                gateRef.current.onBlur();
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby="task-hint"
              disabled={!active}
              placeholder={active ? (isZh ? '用拼音输入法打出上面的字词' : '照着上面的句子输入') : ''}
            />
            <button type="button" className="btn btn--primary btn--large" onPointerDown={confirmPointerDown} onClick={confirmClick} disabled={!active}>
              确认
            </button>
          </div>

          <div className="task-help-line">
            <button type="button" className="btn btn--small" onClick={openHelp} disabled={!active}>
              <Icon name="help" size={18} />
              帮助
            </button>
            <p id="task-hint" className="hint-line" aria-live="polite">
              {isZh ? '输入拼音，用数字键或点选候选字，选好后再确认。' : '输入完点击确认，或按 Enter。'}
            </p>
          </div>

          {diffShown && item && (
            <div className="task-diff" role="note">
              <p className="hint-strong">
                {level >= 2 ? (isZh ? '用退格键删掉不对的字，重新输入拼音，选好汉字再确认。' : '检查大小写和标点；用退格键删掉不对的地方，再重新输入。') : VOICE_LINES_P2.p2Wrong}
              </p>
              <p className="task-diff__row">
                目标：
                {[...target].map((ch, i) => (
                  <span key={i} className="task-diff__chip">{ch === ' ' ? '␣' : ch}</span>
                ))}
              </p>
              <p className="task-diff__row">
                你输入的：
                {[...value].map((ch, i) => (
                  <span key={i} className={`task-diff__chip${[...target][i] !== ch ? ' task-diff__chip--bad' : ''}`}>{ch === ' ' ? '␣' : ch}</span>
                ))}
                {[...value].length < [...target].length && <span className="task-diff__chip task-diff__chip--missing">还差 {[...target].length - [...value].length} 个字符</span>}
              </p>
            </div>
          )}
          {segment && (
            <div className="task-segment" role="note">
              <p className="hint-strong">先输入开头这部分：{segment}{isZh && item?.pinyin ? `（拼音 ${item.pinyin.split(' ').slice(0, [...segment].length).join(' ')}）` : ''}</p>
              <p className="hint-line">还是要把完整内容都输入，再确认。</p>
            </div>
          )}
          {notice && <p className="notice-line" role="status">{notice}</p>}
          {save.partner && (
            <div className="task-practice__partner">
              <PartnerArt partner={save.partner} pose={pose} equipped={save.equipped} animate={animate} title="小伙伴陪你练习" className="practice__partner" />
            </div>
          )}
        </section>
      </div>

      {/* ---------------- overlays ---------------- */}

      {overlay?.kind === 'guide' && (
        <Dialog
          title={GUIDE_CARDS[overlay.index - 1]!.title}
          actions={
            <>
              <button type="button" className="btn" onClick={() => setOverlay({ kind: 'intro' })}>
                跳过引导
              </button>
              {overlay.index > 1 && (
                <button type="button" className="btn" onClick={() => setOverlay({ kind: 'guide', index: (overlay.index - 1) as 1 | 2 })}>
                  上一张
                </button>
              )}
              <button
                type="button"
                className="btn btn--primary"
                data-autofocus
                onClick={() =>
                  overlay.index < 3 ? setOverlay({ kind: 'guide', index: (overlay.index + 1) as 2 | 3 }) : setOverlay({ kind: 'intro' })
                }
              >
                {overlay.index < 3 ? '下一张' : '看任务'}
              </button>
            </>
          }
        >
          <p>{GUIDE_CARDS[overlay.index - 1]!.text}</p>
        </Dialog>
      )}

      {overlay?.kind === 'intro' && (
        <Dialog
          title={task.title}
          className="dialog--wide"
          actions={
            <>
              {save.phase2.teaching['intro'] && (
                <button type="button" className="btn" onClick={() => setOverlay({ kind: 'guide', index: 1 })}>
                  重看输入法引导
                </button>
              )}
              <button type="button" className="btn btn--primary" data-autofocus onClick={beginIntro}>
                开始
              </button>
            </>
          }
        >
          {task.kind === 'story' ? (
            <>
              <p>{phase2Task(task.sourceId)?.intro ?? ''}</p>
              <ol className="task-intro-steps">
                {phase2Task(task.sourceId)?.steps.map((s, i) => (
                  <li key={i}>
                    第 {i + 1} 步：{s.title}（{s.targetCount} 题）
                  </li>
                ))}
              </ol>
              <p className="hint-line">一共 {task.items.length} 题。开始后不加题，提前完成正常结算。</p>
            </>
          ) : (
            <>
              <p>{task.kind === 'errand' ? '居民们请你帮忙练习：这一轮会把学过的内容再练一遍。' : '专项练习：只练这一类内容。'}</p>
              <p className="hint-line">一共 {task.items.length} 题，完成得 {PHASE2_RULES.rewards.repeat} 个灯光币。</p>
            </>
          )}
          <p className="hint-line">奖励：{task.kind === 'story' && !save.phase2.storyDone.includes(task.sourceId) ? `首次完成 ${PHASE2_RULES.rewards.storyFirst} 个灯光币` : `完成 ${PHASE2_RULES.rewards.repeat} 个灯光币`}。</p>
        </Dialog>
      )}

      {overlay?.kind === 'teaching' && (
        <Dialog
          title={TEACHING_CONTENT[overlay.key]?.title ?? '小提示'}
          actions={
            <>
              <button type="button" className="btn" onClick={() => TEACHING_CONTENT[overlay.key]?.lines.forEach((l) => playVoice(l))}>
                <Icon name="replay" size={22} />
                重播语音
              </button>
              <button type="button" className="btn btn--primary" data-autofocus onClick={afterTeaching}>
                知道了
              </button>
            </>
          }
        >
          {TEACHING_CONTENT[overlay.key]?.lines.map((l) => (
            <p key={l}>{VOICE_LINES_P2[l]}</p>
          ))}
        </Dialog>
      )}

      {overlay?.kind === 'ready' && (
        <div className="ready-panel">
          <p className="ready-panel__text">
            {overlay.reason === 'start' && '准备好了吗？'}
            {overlay.reason === 'resume' && '已暂停，题目和输入的内容都还在。'}
            {overlay.reason === 'idle' && '好一会儿没有输入，先暂停啦。'}
            {overlay.reason === 'away' && '已暂停（离开了页面或切换了窗口）。'}
          </p>
          <button type="button" className="btn btn--primary btn--huge" autoFocus onClick={startPlaying}>
            <Icon name="play" size={28} />
            {overlay.reason === 'start' ? '开始' : '继续'}
          </button>
          <p className="hint-line">点按钮开始，然后在输入框里照着目标输入。</p>
        </div>
      )}

      {overlay?.kind === 'help' && (
        <Dialog
          title="帮助"
          className="dialog--wide"
          onClose={() => setOverlay(null)}
          actions={
            <>
              <button type="button" className="btn" onClick={() => item && isZh && playVoice(item.id)}>
                <Icon name="sound" size={20} />
                {isZh ? '读目标' : '重播提示'}
              </button>
              <button type="button" className="btn btn--primary" data-autofocus onClick={() => setOverlay(null)}>
                继续练习
              </button>
            </>
          }
        >
          <p>{isZh ? VOICE_LINES_P2.p2Select : '照着目标输入，输入完点确认或按 Enter。'}</p>
          {isZh && <p>{VOICE_LINES_P2.p2Paging}</p>}
          {item && (
            <div className="help-target">
              <p className="hint-strong">
                现在的目标：{isZh ? `${item.target}（${item.pinyin}）` : target}
              </p>
              {!isZh && enHints.length > 0 && <p className="hint-line">{enHints.join('；')}。</p>}
            </div>
          )}
          <details className="help-more">
            <summary>重看输入法小提示</summary>
            <p>{VOICE_LINES_P2.p2Intro3}</p>
          </details>
        </Dialog>
      )}

      {overlay?.kind === 'menu' && (
        <Dialog
          title="已暂停"
          onClose={() => setOverlay({ kind: 'ready', reason: 'resume' })}
          actions={
            <>
              <button
                type="button"
                className="btn btn--primary"
                data-autofocus
                onClick={() => {
                  setOverlay({ kind: 'ready', reason: 'resume' });
                  window.setTimeout(() => inputRef.current?.focus(), 0);
                }}
              >
                <Icon name="play" size={22} />
                继续
              </button>
              <button type="button" className="btn" onClick={() => setOverlay({ kind: 'restart' })}>
                重新开始这个任务
              </button>
              <button type="button" className="btn" onClick={() => c.go({ name: 'residents' })}>
                保存并退出
              </button>
              <button type="button" className="btn" onClick={() => c.endSessionNow()}>
                结束本次
              </button>
            </>
          }
        >
          <PlayerIdentity compact /><p>已完成 {done}/{task.items.length} 题，进度和输入的内容都保留着，暂停期间不计时。</p>
          {occ?.compositionActive && <p className="notice-line" role="status">{VOICE_LINES_P2.p2ExitIme}</p>}
          <p className="hint-line">退出不等于放弃，回来可以从“居民任务”继续。</p>
        </Dialog>
      )}

      {overlay?.kind === 'restart' && (
        <Dialog
          title="重新开始这个任务？"
          onClose={() => setOverlay({ kind: 'menu' })}
          actions={
            <>
              <button type="button" className="btn" data-autofocus onClick={() => setOverlay({ kind: 'menu' })}>
                取消
              </button>
              <button type="button" className="btn btn--danger" onClick={() => c.restartP2()}>
                放弃并重新开始
              </button>
            </>
          }
        >
          <p>
            会生成一轮新的题目；这一轮没有完成的题不发奖励，已经完成的 {done} 题和练习记录都保留。
          </p>
        </Dialog>
      )}

      {overlay?.kind === 'step-done' && (() => {
        const completedStep = Math.max(0, currentStep(task) - 1);
        return (
          <Dialog
            title={`第 ${completedStep + 1} 步完成！`}
            actions={
              <button type="button" className="btn btn--primary" data-autofocus onClick={() => setOverlay(null)}>
                继续
              </button>
            }
          >
            <LifeEffect buildingId={task.buildingId} theme={save.theme} animate={animate} title={phase2Task(task.sourceId)?.steps[completedStep]?.title ?? '本步骤完成'} className="life-effect" />
            <p>
              {phase2Task(task.sourceId)?.steps[completedStep]?.title ?? ''}：已整理 {task.stepCounts[completedStep]}/{task.stepCounts[completedStep]}。
            </p>
            <p className="hint-line">这一步不会点亮建筑，只是居民的小改动。</p>
          </Dialog>
        );
      })()}
    </div>
  );
}

function buildingIndexOf(buildingId: string): number {
  // 与 art/phase2/LifeScene.tsx 保持一致：由建筑 id 得到下标。
  const BUILDINGS: { id: string; index: number }[] = [
    { id: 'lamp-house', index: 0 },
    { id: 'bakery', index: 1 },
    { id: 'post-office', index: 2 },
    { id: 'flower-house', index: 3 },
    { id: 'clock-tower', index: 4 },
    { id: 'library', index: 5 },
    { id: 'music-house', index: 6 },
    { id: 'observatory', index: 7 },
    { id: 'windmill', index: 8 },
    { id: 'lighthouse', index: 9 },
    { id: 'boathouse', index: 10 },
    { id: 'festival-hall', index: 11 },
  ];
  return BUILDINGS.find((b) => b.id === buildingId)?.index ?? 0;
}
