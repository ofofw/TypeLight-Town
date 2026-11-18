import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { PartnerArt } from '../../art/partners';
import { PARTNERS, partnerById, type PartnerId } from '../../config/shop';
import { VOICE_LINES } from '../../config/voice';
import { TopBar } from '../components/Chrome';
import { Icon } from '../components/Icon';
import { useAnimate, useAppState, useController } from '../hooks';

/** P02 伙伴选择 (first visit, or 更换伙伴 from settings) */
export function PartnerPage({ from }: { from: 'first' | 'settings' }) {
  const c = useController();
  const { save } = useAppState();
  const animate = useAnimate();
  const [selected, setSelected] = useState<PartnerId>(save.partner ?? PARTNERS[0].id);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (from === 'first') c.speak('choosePartner');
  }, [c, from]);

  const confirm = () => {
    c.pickPartner(selected);
    c.go(from === 'first' ? { name: 'onboarding', replay: false } : { name: 'settings' });
  };

  const move = (delta: number) => {
    const i = PARTNERS.findIndex((p) => p.id === selected);
    const next = (i + delta + PARTNERS.length) % PARTNERS.length;
    setSelected(PARTNERS[next].id);
    cardRefs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      confirm();
    }
  };

  const chosen = partnerById(selected)!;
  return (
    <div className="page partner-page">
      <TopBar
        title="选择小伙伴"
        onBack={() => c.go(from === 'first' ? { name: 'home' } : { name: 'settings' })}
        backLabel={from === 'first' ? '首页' : '设置'}
      />
      <p className="lead">
        {VOICE_LINES.choosePartner}
        {from === 'settings' && ' 更换后，灯光币、课程、建筑和装扮都会保留。'}
      </p>
      <p className="hint-line">可以点一点，也可以用方向键挑选，按 Enter 确认。</p>
      <div className="partner-cards" role="radiogroup" aria-label="小伙伴" onKeyDown={onKeyDown}>
        {PARTNERS.map((p, i) => {
          const isOn = p.id === selected;
          return (
            <button
              key={p.id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isOn}
              tabIndex={isOn ? 0 : -1}
              className={`partner-card${isOn ? ' partner-card--on' : ''}`}
              onClick={() => setSelected(p.id)}
            >
              <PartnerArt
                partner={p.id}
                pose={isOn ? 'encourage' : 'idle'}
                equipped={save.equipped}
                animate={animate && isOn}
                title={`${p.name}，${p.species}`}
                className="partner-card__art"
              />
              <span className="partner-card__name">
                {p.name}
                <small>{p.species}</small>
              </span>
              <span className="partner-card__intro">{p.intro}</span>
              <span className="partner-card__state">
                {isOn ? (
                  <>
                    <Icon name="check" size={20} />
                    已选中
                  </>
                ) : (
                  '点我选择'
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div className="page-actions">
        <button type="button" className="btn btn--primary btn--large" onClick={confirm}>
          就选{chosen.name}了
        </button>
      </div>
    </div>
  );
}
