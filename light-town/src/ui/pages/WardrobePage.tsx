import { useState, type ReactNode } from 'react';
import { AccessoryIcon, PartnerArt } from '../../art/partners';
import { ACCESSORIES, SLOT_NAMES, accessoryById, partnerById, type AccessorySlot } from '../../config/shop';
import { TopBar } from '../components/Chrome';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { useAnimate, useAppState, useController } from '../hooks';

const SLOTS: AccessorySlot[] = ['head', 'scarf', 'lamp'];

interface Selection {
  slot: AccessorySlot;
  id: string | null;
}

/** P08 衣柜 */
export function WardrobePage() {
  const c = useController();
  const { save } = useAppState();
  const animate = useAnimate();
  const [sel, setSel] = useState<Selection | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const partner = save.partner ? partnerById(save.partner) : null;

  const preview = sel ? { ...save.equipped, [sel.slot]: sel.id } : save.equipped;
  const selItem = sel?.id ? accessoryById(sel.id) : undefined;

  const select = (s: Selection) => {
    setSel(s);
    setMessage(null);
  };

  const buy = (id: string) => {
    const item = accessoryById(id)!;
    const err = c.buy(id);
    setConfirmId(null);
    if (err === null) setMessage(`买好了，已经戴上${item.name}！`);
    else if (err === 'insufficient') setMessage('灯光币还不够，多练几关再来吧。');
    else if (err === 'owned') setMessage(`${item.name}已经有了，不会重复扣币。`);
  };

  const equip = (slot: AccessorySlot, id: string | null) => {
    if (c.equip(slot, id) === null) {
      setMessage(id ? `已经戴上${accessoryById(id)!.name}。` : `已经取下${SLOT_NAMES[slot]}。`);
    }
  };

  let action: ReactNode = null;
  if (sel) {
    const equipped = save.equipped[sel.slot] === sel.id;
    if (sel.id === null) {
      action = equipped ? (
        <p className="hint-line">现在没有戴{SLOT_NAMES[sel.slot]}。</p>
      ) : (
        <button type="button" className="btn btn--primary" onClick={() => equip(sel.slot, null)}>
          不戴{SLOT_NAMES[sel.slot]}
        </button>
      );
    } else if (selItem) {
      const owned = save.owned.includes(selItem.id);
      if (equipped) {
        action = (
          <button type="button" className="btn" onClick={() => equip(sel.slot, null)}>
            取下{selItem.name}
          </button>
        );
      } else if (owned) {
        action = (
          <button type="button" className="btn btn--primary" onClick={() => equip(sel.slot, selItem.id)}>
            戴上{selItem.name}
          </button>
        );
      } else if (save.coins >= selItem.price) {
        action = (
          <button type="button" className="btn btn--primary" onClick={() => setConfirmId(selItem.id)}>
            <Icon name="coin" size={22} />
            用 {selItem.price} 灯光币购买
          </button>
        );
      } else {
        action = (
          <>
            <button type="button" className="btn" disabled>
              <Icon name="coin" size={22} />
              {selItem.price} 灯光币
            </button>
            <p className="hint-line">还差 {selItem.price - save.coins} 灯光币，现在还不能买。</p>
          </>
        );
      }
    }
  }

  const confirmItem = confirmId ? accessoryById(confirmId) : undefined;

  return (
    <div className="page wardrobe">
      <TopBar title="衣柜" onBack={() => c.go({ name: 'town' })} backLabel="小镇" showCoins />
      <div className="wardrobe__layout">
        <section className="wardrobe__preview card" aria-label="试穿预览">
          {save.partner && partner && (
            <PartnerArt
              partner={save.partner}
              pose="idle"
              equipped={preview}
              animate={animate}
              title={`${partner.name}的试穿预览`}
              className="wardrobe__partner"
            />
          )}
          <p className="wardrobe__preview-label">{sel ? `正在试穿：${selItem ? selItem.name : `不戴${SLOT_NAMES[sel.slot]}`}` : '点右边的饰品，可以先试穿看看'}</p>
          <div className="wardrobe__action">{action}</div>
          {message && (
            <p className="notice-line" role="status">
              {message}
            </p>
          )}
          <p className="hint-line">每类同时只能戴一件。三个小伙伴都能戴，换伙伴也会保留。</p>
        </section>
        <div className="wardrobe__slots">
          {SLOTS.map((slot) => (
            <section key={slot} className="wardrobe__slot" aria-label={SLOT_NAMES[slot]}>
              <h2>{SLOT_NAMES[slot]}</h2>
              <div className="item-grid">
                {[null, ...ACCESSORIES.filter((a) => a.slot === slot).map((a) => a.id)].map((id) => {
                  const item = id ? accessoryById(id) : undefined;
                  const owned = id === null || save.owned.includes(id);
                  const equipped = save.equipped[slot] === id;
                  const selected = sel?.slot === slot && sel.id === id;
                  const name = item ? item.name : '不戴';
                  const status = id === null ? (equipped ? '现在' : '取下') : equipped ? '已戴上' : owned ? '已拥有' : `${item!.price} 币`;
                  return (
                    <button
                      key={id ?? 'none'}
                      type="button"
                      className={`item-card${selected ? ' item-card--selected' : ''}${equipped ? ' item-card--equipped' : ''}`}
                      aria-pressed={selected}
                      onClick={() => select({ slot, id })}
                    >
                      <AccessoryIcon id={id} slot={slot} title={name} className="item-card__icon" />
                      <span className="item-card__name">{name}</span>
                      <span className="item-card__status">
                        {equipped && <Icon name="check" size={16} />}
                        {!owned && <Icon name="coin" size={18} />}
                        {status}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
      {confirmItem && (
        <Dialog
          title={`购买${confirmItem.name}？`}
          onClose={() => setConfirmId(null)}
          actions={
            <>
              <button type="button" className="btn" data-autofocus onClick={() => setConfirmId(null)}>
                取消
              </button>
              <button type="button" className="btn btn--primary" onClick={() => buy(confirmItem.id)}>
                购买
              </button>
            </>
          }
        >
          <p>
            用 {confirmItem.price} 灯光币购买{confirmItem.name}，买下后会自动戴上。现在有 {save.coins} 灯光币，买完还剩 {save.coins - confirmItem.price}。
          </p>
        </Dialog>
      )}
    </div>
  );
}
