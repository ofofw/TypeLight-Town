import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

let openCount = 0;

/** True while any modal dialog is open (practice input is not captured then). */
export function isDialogOpen(): boolean {
  return openCount > 0;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function tabbables(box: HTMLElement): HTMLElement[] {
  return [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
}

export interface DialogProps {
  title: string;
  children?: ReactNode;
  /** Buttons row. Put data-autofocus on the button that should get focus first. */
  actions: ReactNode;
  /** Escape and the backdrop do nothing unless onClose is given. */
  onClose?: () => void;
  tone?: 'normal' | 'warning';
  className?: string;
}

/** Modal dialog: focus moves inside, Tab stays inside, Escape closes, focus returns afterwards. */
export function Dialog({ title, children, actions, onClose, tone = 'normal', className }: DialogProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    openCount += 1;
    if (root) root.inert = true;
    const box = ref.current;
    const target = box?.querySelector<HTMLElement>('[data-autofocus]') ?? (box && tabbables(box)[0]) ?? box;
    target?.focus();
    return () => {
      openCount -= 1;
      if (root && openCount === 0) root.inert = false;
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      if (onCloseRef.current) {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
      }
      return;
    }
    // Tab is handled here completely: Safari skips buttons on Tab by default and would leave the dialog.
    if (e.key !== 'Tab' || !ref.current) return;
    e.preventDefault();
    // A confirmation may be opened from the pause dialog; only its own trap handles Tab.
    e.stopPropagation();
    const items = tabbables(ref.current);
    if (items.length === 0) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : i === -1 || i === items.length - 1 ? 0 : i + 1;
    items[next].focus();
  };

  return createPortal(
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCloseRef.current?.()}>
      <div
        ref={ref}
        className={`dialog dialog--${tone}${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className="dialog__title">
          {title}
        </h2>
        {children && <div className="dialog__body">{children}</div>}
        <div className="dialog__actions">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}
