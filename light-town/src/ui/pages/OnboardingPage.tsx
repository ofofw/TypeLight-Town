import { useEffect, useState } from 'react';
import { DemoWindow } from '../../art/buildings';
import { HandsArt, PartnerArt } from '../../art/partners';
import { FINGER_NAMES, KEY_FINGER } from '../../config/keys';
import { VOICE_LINES, type VoiceId } from '../../config/voice';
import { TopBar } from '../components/Chrome';
import { Icon } from '../components/Icon';
import { Keyboard } from '../components/Keyboard';
import { useAnimate, useAppState, useController } from '../hooks';
import { usePracticeKeys } from '../usePracticeKeys';

const DEMO_KEYS = ['f', 'j', 'f', 'j'] as const;

interface Step {
  title: string;
  text: string;
  voices: VoiceId[];
}

const STEPS: Step[] = [
  { title: '欢迎来到点亮小镇', text: `${VOICE_LINES.welcome} ${VOICE_LINES.keyboardCheck}`, voices: ['welcome', 'keyboardCheck'] },
  { title: '找到小凸点', text: '键盘中间的 F 键和 J 键上各有一个小凸起，不看键盘也能摸到它们。', voices: ['bumps'] },
  {
    title: '放好双手',
    text: '左手食指放在 F 上，右手食指放在 J 上；其他手指依次放在 A S D 和 K L ; 上，拇指轻轻放在空格键上。手腕放松。',
    voices: ['handPlacement'],
  },
  { title: '点亮第一扇窗', text: '轮流按 f 和 j，一共按 4 次。按对一次，窗户就亮一格。', voices: ['demoTry'] },
];

/** P03 首次引导 (also 重看指法 from settings, which changes nothing in the save). */
export function OnboardingPage({ replay }: { replay: boolean }) {
  const c = useController();
  const { save } = useAppState();
  const animate = useAnimate();
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState(0);
  const [missed, setMissed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const demo = step === STEPS.length - 1;
  const done = demo && pos >= DEMO_KEYS.length;
  const target = demo && !done ? DEMO_KEYS[pos] : null;

  useEffect(() => {
    c.speak(...STEPS[step].voices);
  }, [c, step]);

  useEffect(() => {
    if (done) c.speak('demoDone');
  }, [c, done]);

  usePracticeKeys(demo && !done, false, {
    onChar(ch, info) {
      setNotice(
        info.uppercase ? (info.capsLock ? '大写锁定开着，可以把它关掉（不关也能继续）。' : '不用按 Shift 键，直接按字母就好。') : null,
      );
      if (ch === target) {
        setPos((p) => p + 1);
        setMissed(false);
        c.audio.playSfx('correct');
      } else {
        setMissed(true);
        c.audio.playSfx('error');
      }
    },
    onComposing: () => setNotice('现在是中文输入法，请切换到英文输入（按一下 Caps Lock 或 Ctrl+空格 切换）。'),
    onOtherVisible: () => setNotice('这里只按字母键。如果按了字母却没反应，请检查是不是切换成了其他输入法。'),
  });

  const finish = () => {
    if (replay) {
      c.go({ name: 'settings' });
    } else {
      c.completeOnboarding();
      c.go({ name: 'town' });
    }
  };

  const s = STEPS[step];
  const finger = target ? KEY_FINGER[target] : null;
  return (
    <div className="page onboarding">
      <TopBar
        title={replay ? '重看指法' : '准备开始'}
        onBack={() => c.go(replay ? { name: 'settings' } : { name: 'home' })}
        backLabel={replay ? '设置' : '首页'}
      />
      <ol className="steps" aria-label="引导步骤">
        {STEPS.map((st, i) => {
          const finished = i < step || done;
          return (
            <li
              key={st.title}
              className={finished ? 'steps__item steps__item--done' : i === step ? 'steps__item steps__item--on' : 'steps__item'}
              aria-current={i === step ? 'step' : undefined}
            >
              <span className="steps__num">{finished ? <Icon name="check" size={16} /> : i + 1}</span>
              <span className="steps__label">{st.title}</span>
            </li>
          );
        })}
      </ol>
      <section className="onboarding__body" aria-live="polite">
        <div className="onboarding__art">
          {step === 0 && (
            <div className="onboarding__welcome">
              {save.partner && (
                <PartnerArt partner={save.partner} pose="guide" equipped={save.equipped} animate={animate} title="小伙伴在打招呼" className="onboarding__partner" />
              )}
              <Keyboard target={null} label="实体键盘示意图" className="keyboard--compact" />
            </div>
          )}
          {step === 1 && <Keyboard target={null} marked={['f', 'j']} label="键盘示意图：F 和 J 键上有小凸起" />}
          {step === 2 && <HandsArt finger={null} emphasis={false} showHomeKeys animate={animate} title="双手放在基准键上的示意图" className="onboarding__hands" />}
          {demo && (
            <div className={done ? 'onboarding__demo onboarding__demo--done' : 'onboarding__demo'}>
              <div className="onboarding__demo-top">
                <DemoWindow lit={pos} animate={animate} title={`示范窗户，已亮 ${pos}/4 格`} className="onboarding__window" />
                {!done && (
                  <div className="onboarding__demo-side">
                    <div className={`target-box${missed ? ' target-box--missed' : ''}`} aria-label={`请按 ${target}`}>
                      <span className="target-letter">{target}</span>
                    </div>
                    <p className="finger-line">
                      {finger && `用${FINGER_NAMES[finger]}按 ${target?.toUpperCase()}`}
                      {missed && <span className="soft-note">　再找找看，没关系</span>}
                    </p>
                  </div>
                )}
              </div>
              {!done && (
                <>
                  <Keyboard target={target} label={`键盘示意图，目标键 ${target?.toUpperCase()}`} className="onboarding__keyboard" />
                  <HandsArt finger={finger} emphasis={missed} animate={animate} title={finger ? `用${FINGER_NAMES[finger]}` : '双手示意图'} className="onboarding__hands-small" />
                </>
              )}
            </div>
          )}
        </div>
        <div className="onboarding__text">
          <h2>{done ? '准备好了！' : s.title}</h2>
          <p>{done ? VOICE_LINES.demoDone : s.text}</p>
          {notice && <p className="notice-line">{notice}</p>}
          {demo && !done && <p className="hint-line">示范练习不计金币，也不算进学习记录。</p>}
        </div>
      </section>
      <div className="page-actions">
        <button type="button" className="btn" onClick={() => c.speak(...(done ? (['demoDone'] as VoiceId[]) : s.voices))}>
          <Icon name="replay" size={22} />
          重播语音
        </button>
        {step > 0 && !done && (
          <button type="button" className="btn" onClick={() => setStep(step - 1)}>
            上一步
          </button>
        )}
        {!demo && (
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setStep(STEPS.length - 1)}>
              跳过说明
            </button>
            <button type="button" className="btn btn--primary btn--large" onClick={() => setStep(step + 1)}>
              下一步
            </button>
          </>
        )}
        {done && (
          <button type="button" className="btn btn--primary btn--large" onClick={finish}>
            {replay ? '完成' : '去小镇'}
          </button>
        )}
      </div>
    </div>
  );
}
