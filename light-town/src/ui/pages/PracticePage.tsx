import { PlayerIdentity } from '../components/PlayerIdentity';
import { memo, useEffect, useRef, useState } from 'react';
import { BuildingSvg } from '../../art/buildings';
import { HandsArt, PartnerArt } from '../../art/partners';
import type { PartnerPose } from '../../art/types';
import { FINGER_NAMES, KEY_FINGER, SPACE, fingerHint, newKeysForStage } from '../../config/keys';
import { RULES } from '../../config/rules';
import type { AccessorySlot, PartnerId, ThemeId } from '../../config/shop';
import { VOICE_LINES, type VoiceId } from '../../config/voice';
import { idleMs, p1Level } from '../../core/game';
import type { LevelState, Mode, SaveData } from '../../core/types';
import { SoundButton } from '../components/Chrome';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { Keyboard } from '../components/Keyboard';
import { LightStrip } from '../components/LightStrip';
import { StageKeys } from '../components/StageKeys';
import { TargetDisplay, signGroups } from '../components/Targets';
import { useAnimate, useAppState, useController, useNow } from '../hooks';
import { MODE_DESCRIPTIONS, MODE_NAMES, buildingName, keyCapName, levelHeading, stageProgressText } from '../text';
import { usePracticeKeys } from '../usePracticeKeys';

type Overlay =
  | { kind: 'stage-intro' }
  | { kind: 'mode-intro' }
  | { kind: 'ready'; reason: 'start' | 'resume' | 'idle' | 'away' }
  | { kind: 'help' }
  | { kind: 'menu' }
  | { kind: 'restart' }
  | null;

const MODE_VOICE: Record<Mode, VoiceId> = { keys: 'modeKeys', strip: 'modeStrip', sign: 'modeSign' };

function needsStageIntro(save: SaveData, level: LevelState): boolean {
  const stage = save.course.stage;
  return stage > save.course.introSeen && newKeysForStage(stage).every((k) => level.keys.includes(k));
}

function signNeedsSpace(level: LevelState): boolean {
  return level.mode === 'sign' && level.targets.includes(SPACE);
}

function needsModeIntro(save: SaveData, level: LevelState): boolean {
  return !save.seen[`mode:${level.mode}`] || (signNeedsSpace(level) && !save.seen['mode:sign-space']);
}

function firstOverlay(save: SaveData, level: LevelState, autoStart: boolean): Overlay {
  if (needsStageIntro(save, level)) return { kind: 'stage-intro' };
  if (needsModeIntro(save, level)) return { kind: 'mode-intro' };
  if (autoStart) return null;
  return { kind: 'ready', reason: level.attempts > 0 ? 'resume' : 'start' };
}

/** P05 练习 */
export function PracticePage({ autoStart }: { autoStart: boolean }) {
  const c = useController();
  const { save } = useAppState();
  const level = p1Level(save);
  useEffect(() => {
    if (!level) c.go({ name: 'town' });
  }, [c, level]);
  if (!level) return null;
  return <PracticeSession key={level.id} level={level} save={save} autoStart={autoStart} />;
}

const Visual = memo(function Visual(props: {
  entry: LevelState['entry'];
  building: number | null;
  stage: number;
  pending: number;
  pendingMax: number;
  theme: ThemeId;
  animate: boolean;
  partner: PartnerId | null;
  equipped: Record<AccessorySlot, string | null>;
  pose: PartnerPose;
}) {
  const { entry, building, stage, pending, pendingMax, theme, animate, partner, equipped, pose } = props;
  if (entry === 'light' && building !== null) {
    return (
      <figure className="practice__visual">
        <BuildingSvg
          index={building}
          stage={stage}
          pending={pending}
          pendingMax={pendingMax}
          theme={theme}
          animate={animate}
          title={`${buildingName(building)}，${stageProgressText(stage)}，这一关已收集 ${pending} 个光点`}
          className="practice__building"
        />
        <figcaption>
          {buildingName(building)} · {stageProgressText(stage)}
          <br />
          <span className="hint-line">完成这一关，点亮第 {stage + 1} 盏灯</span>
        </figcaption>
      </figure>
    );
  }
  if (entry === 'replay' && building !== null) {
    return (
      <figure className="practice__visual">
        <BuildingSvg index={building} stage={stage} theme={theme} animate={animate} title={`${buildingName(building)}，已全部点亮`} className="practice__building" />
        <figcaption>
          重练{buildingName(building)}
          <br />
          <span className="hint-line">不会改变建筑进度，照常得到灯光币</span>
        </figcaption>
      </figure>
    );
  }
  return (
    <figure className="practice__visual">
      {partner && <PartnerArt partner={partner} pose={pose} equipped={equipped} animate={animate} title="小伙伴陪你练习" className="practice__partner-large" />}
      <figcaption>
        练习关
        <br />
        <span className="hint-line">这一关不会点亮建筑，照常得到灯光币</span>
      </figcaption>
    </figure>
  );
});

function PracticeSession({ level, save, autoStart }: { level: LevelState; save: SaveData; autoStart: boolean }) {
  const c = useController();
  const animate = useAnimate();
  const [overlay, setOverlay] = useState<Overlay>(() => (level.paused ? firstOverlay(save, level, autoStart) : null));
  const [missedAt, setMissedAt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = !level.paused && overlay === null;
  const now = useNow(500, active);

  // A level started from the result page's 继续 runs right away (that click was the confirmation).
  useEffect(() => {
    if (level.paused && overlay === null) c.resume();
    // Only on mount: later pauses show the ready panel instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paused from outside (window blur, page hidden, lease lost): ask before continuing.
  useEffect(() => {
    const current = p1Level(c.getState().save);
    if (current?.paused && overlay === null) setOverlay({ kind: 'ready', reason: 'away' });
  }, [c, level.paused, overlay]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      if (c.tickPractice()) setOverlay({ kind: 'ready', reason: 'idle' });
    }, 1000);
    return () => clearInterval(id);
  }, [active, c]);

  useEffect(() => {
    if (overlay === null) rootRef.current?.focus({ preventScroll: true });
  }, [overlay]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  // Voice for introductions and help (teaching voice: the level is paused meanwhile).
  useEffect(() => {
    if (overlay?.kind === 'stage-intro') c.speak('newKeys');
    if (overlay?.kind === 'mode-intro') {
      const lines: VoiceId[] = [];
      if (!save.seen[`mode:${level.mode}`]) lines.push(MODE_VOICE[level.mode]);
      if (signNeedsSpace(level) && !save.seen['mode:sign-space']) lines.push('modeSignSpace');
      c.speak(...lines);
    }
    if (overlay?.kind === 'help') c.speak('help');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay?.kind]);

  usePracticeKeys(active, level.keys.includes(SPACE), {
    onChar(ch, info) {
      if (info.uppercase) {
        setNotice(info.capsLock ? '大写锁定开着，可以把它关掉（不关也能继续）。' : '不用按 Shift 键，直接按字母就好。');
      }
      const r = c.input(ch);
      if (r.outcome === 'wrong') setMissedAt(Date.now());
      else if (r.outcome === 'correct') setMissedAt(0);
    },
    onPause() {
      c.pause();
      setOverlay({ kind: 'menu' });
    },
    onComposing: () => setNotice('现在是中文输入法，请切换到英文输入（按一下 Caps Lock 或 Ctrl+空格 切换）。'),
    onOtherVisible: () =>
      setNotice(level.keys.includes(SPACE) ? '这里只按字母和空格。' : '这里只按字母键。如果按了字母没反应，请检查是不是切换成了其他输入法。'),
  });

  const startPlaying = () => {
    c.resume();
    setOverlay(null);
  };

  const afterStageIntro = () => {
    c.seeIntro(save.course.stage);
    if (needsModeIntro(save, level)) setOverlay({ kind: 'mode-intro' });
    else startPlaying();
  };

  const afterModeIntro = () => {
    c.see(`mode:${level.mode}`);
    if (signNeedsSpace(level)) c.see('mode:sign-space');
    startPlaying();
  };

  const openMenu = () => {
    c.pause();
    setOverlay({ kind: 'menu' });
  };

  const openHelp = () => {
    c.pause();
    setOverlay({ kind: 'help' });
  };

  const target = level.targets[level.pos] ?? null;
  const finger = target ? KEY_FINGER[target] : null;
  const idle = idleMs(level, now);
  const enhanced = active && (level.wrongStreak >= RULES.timing.hintWrongStreak || idle >= RULES.timing.hintWaitMs);
  const missed = missedAt > 0 && now - missedAt < 1500;
  const noInputYet = active && level.attempts === 0 && idle >= RULES.timing.hintWaitMs;
  const pose: PartnerPose = missed ? 'encourage' : enhanced ? 'guide' : 'idle';
  const fingerText = target ? (target === SPACE ? '用拇指按空格键' : `用${FINGER_NAMES[finger!]}按 ${keyCapName(target)}`) : '';
  const isBuildingLevel = (level.entry === 'light' || level.entry === 'replay') && (level.buildingTarget ?? level.replayBuilding) !== null;
  const building = level.entry === 'light' ? level.buildingTarget : level.replayBuilding;

  return (
    <div className="page practice" ref={rootRef} tabIndex={-1}>
      <header className="topbar topbar--practice">
        <h1 className="topbar__title">{levelHeading(level)}</h1>
        <div className="topbar__actions">
          <button type="button" className="icon-btn" onClick={openMenu}>
            <Icon name="pause" />
            <span className="icon-btn__label">暂停</span>
          </button>
          <SoundButton />
          <button type="button" className="icon-btn" onClick={openHelp}>
            <Icon name="help" />
            <span className="icon-btn__label">帮助</span>
          </button>
        </div>
      </header>

      <div className="practice__layout">
        <Visual
          entry={level.entry}
          building={building}
          stage={building !== null ? save.buildings[building] : 0}
          pending={level.pos}
          pendingMax={level.targets.length}
          theme={save.theme}
          animate={animate}
          partner={save.partner}
          equipped={save.equipped}
          pose={pose}
        />

        <section className="practice__main" aria-label="练习区">
          <LightStrip
            total={level.targets.length}
            done={level.pos}
            groupSize={level.mode === 'strip' ? RULES.stripGroupSize : undefined}
            groups={level.mode === 'sign' ? signGroups(level) : undefined}
            theme={save.theme}
            label={`本关进度 ${level.pos}/${level.targets.length}`}
          />
          <div className="practice__target-wrap">
            {isBuildingLevel && save.partner && (
              <PartnerArt partner={save.partner} pose={pose} equipped={save.equipped} animate={animate} title="小伙伴" className="practice__partner" />
            )}
            {overlay?.kind === 'ready' ? (
              <div className="ready-panel">
                <p className="ready-panel__text">
                  {overlay.reason === 'start' && '准备好了吗？'}
                  {overlay.reason === 'resume' && '已暂停，题目和进度都还在。'}
                  {overlay.reason === 'idle' && '好一会儿没有按键，先暂停啦。'}
                  {overlay.reason === 'away' && '已暂停（离开了页面或切换了窗口）。'}
                </p>
                <button type="button" className="btn btn--primary btn--huge" autoFocus onClick={startPlaying}>
                  <Icon name="play" size={28} />
                  {overlay.reason === 'start' ? '开始' : '继续'}
                </button>
                <p className="hint-line">点按钮或按 Enter 开始，然后看着字母按键。</p>
              </div>
            ) : (
              target !== null && <TargetDisplay level={level} missed={missed} />
            )}
          </div>
          <p className="finger-line" aria-live="polite">
            {fingerText}
            {missed && <span className="soft-note">　再找找看，没关系</span>}
          </p>
          {enhanced && target && <p className="hint-strong">{fingerHint(target)}</p>}
          {noInputYet && <p className="notice-line">没有收到按键？请检查实体键盘是否连接好（iPad 需要连接外接键盘）。</p>}
          {notice && <p className="notice-line">{notice}</p>}
        </section>
      </div>

      <section className="practice__keys" aria-label="键盘和手指提示">
        <Keyboard
          target={overlay?.kind === 'ready' ? null : target}
          enhanced={enhanced}
          available={new Set(level.keys)}
          label={target ? `屏幕键盘，目标键 ${keyCapName(target)}，${fingerText}` : '屏幕键盘'}
        />
        <HandsArt
          finger={overlay?.kind === 'ready' ? null : finger}
          emphasis={enhanced}
          animate={animate}
          title={fingerText || '双手示意图'}
          className="practice__hands"
        />
      </section>

      {overlay?.kind === 'stage-intro' && (
        <Dialog
          title={`新的按键：第 ${save.course.stage} 阶`}
          className="dialog--wide"
          actions={
            <>
              <button type="button" className="btn" onClick={() => c.speak('newKeys')}>
                <Icon name="replay" size={22} />
                重播语音
              </button>
              <button type="button" className="btn btn--primary" data-autofocus onClick={afterStageIntro}>
                知道了，开始
              </button>
            </>
          }
        >
          <p>{VOICE_LINES.newKeys}</p>
          <StageKeys stage={save.course.stage} />
        </Dialog>
      )}

      {overlay?.kind === 'mode-intro' && (
        <Dialog
          title={`新玩法：${MODE_NAMES[level.mode]}`}
          actions={
            <>
              <button type="button" className="btn" onClick={() => c.speak(MODE_VOICE[level.mode], ...(signNeedsSpace(level) ? (['modeSignSpace'] as VoiceId[]) : []))}>
                <Icon name="replay" size={22} />
                重播语音
              </button>
              <button type="button" className="btn btn--primary" data-autofocus onClick={afterModeIntro}>
                开始
              </button>
            </>
          }
        >
          <ModeExplainer mode={level.mode} withSpace={signNeedsSpace(level)} />
        </Dialog>
      )}

      {overlay?.kind === 'help' && (
        <Dialog
          title="帮助"
          className="dialog--wide"
          onClose={() => setOverlay({ kind: 'ready', reason: 'resume' })}
          actions={
            <>
              <button type="button" className="btn" onClick={() => c.speak('help', MODE_VOICE[level.mode])}>
                <Icon name="replay" size={22} />
                重播语音
              </button>
              <button type="button" className="btn btn--primary" data-autofocus onClick={startPlaying}>
                继续练习
              </button>
            </>
          }
        >
          <p>{VOICE_LINES.help}</p>
          <ModeExplainer mode={level.mode} withSpace={signNeedsSpace(level)} />
          {target && (
            <div className="help-target">
              <p className="hint-strong">
                现在要按：{keyCapName(target)}。{fingerHint(target)}
              </p>
              <Keyboard target={target} enhanced label={`目标键 ${keyCapName(target)}`} className="keyboard--compact" />
            </div>
          )}
          <details className="help-more">
            <summary>看看这一阶的新按键</summary>
            <StageKeys stage={save.course.stage} />
          </details>
        </Dialog>
      )}

      {overlay?.kind === 'menu' && (
        <Dialog
          title="已暂停"
          onClose={() => setOverlay({ kind: 'ready', reason: 'resume' })}
          actions={
            <>
              <button type="button" className="btn btn--primary" data-autofocus onClick={startPlaying}>
                <Icon name="play" size={22} />
                继续
              </button>
              <button type="button" className="btn" onClick={() => setOverlay({ kind: 'restart' })}>
                重新开始这一关
              </button>
              <button type="button" className="btn" onClick={() => c.go({ name: 'town' })}>
                <Icon name="home" size={22} />
                回小镇
              </button>
              <button type="button" className="btn" onClick={() => c.endSessionNow()}>
                结束本次
              </button>
            </>
          }
        >
          <PlayerIdentity compact /><p>题目和进度都保留着，暂停期间不计时。</p>
          <p className="hint-line">回小镇以后，下次可以“继续上次”接着这一关。</p>
        </Dialog>
      )}

      {overlay?.kind === 'restart' && (
        <Dialog
          title="重新开始这一关？"
          onClose={() => setOverlay({ kind: 'menu' })}
          actions={
            <>
              <button type="button" className="btn" data-autofocus onClick={() => setOverlay({ kind: 'menu' })}>
                取消
              </button>
              <button type="button" className="btn btn--primary" onClick={() => c.restartActive()}>
                重新开始
              </button>
            </>
          }
        >
          <p>会换一组新的题目。已经按过的记录会保留，这一关没完成的部分不发奖励。</p>
        </Dialog>
      )}
    </div>
  );
}

function ModeExplainer({ mode, withSpace }: { mode: Mode; withSpace: boolean }) {
  return (
    <div className="mode-explainer">
      <p>{MODE_DESCRIPTIONS[mode]}</p>
      <div className="mode-explainer__demo" aria-hidden="true">
        {mode === 'keys' && <span className="target-char target-char--current">f</span>}
        {mode === 'strip' && (
          <>
            <span className="target-char target-char--done">f</span>
            <span className="target-char target-char--current">j</span>
            <span className="target-char target-char--todo">d</span>
          </>
        )}
        {mode === 'sign' && (
          <>
            <span className="target-char target-char--done">s</span>
            <span className="target-char target-char--current">u</span>
            <span className="target-char target-char--todo">n</span>
            {withSpace && (
              <span className="target-char target-char--todo target-char--space">
                <span className="space-symbol" />
                <span className="space-word">空格</span>
              </span>
            )}
          </>
        )}
      </div>
      {withSpace && <p>{VOICE_LINES.modeSignSpace}</p>}
      <p className="hint-line">打错了不用删除，找到正确的键再按一次就好。没有时间限制。</p>
    </div>
  );
}
