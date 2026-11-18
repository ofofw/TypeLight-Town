import { useState } from 'react';
import type { ReactNode } from 'react';
import { useAppState, useAudioStatus, useController } from '../hooks';
import { Icon } from './Icon';

export function CoinBadge() {
  const { save } = useAppState();
  return (
    <span className="coin-badge" aria-label={`灯光币 ${save.coins}`}>
      <Icon name="coin" size={26} />
      <span aria-hidden="true">{save.coins}</span>
    </span>
  );
}

/** Master mute toggle (always visible) plus a recovery button when audio was blocked or failed. */
export function SoundButton() {
  const c = useController();
  const { save } = useAppState();
  const status = useAudioStatus();
  const muted = save.settings.masterMute;
  return (
    <>
      {(status === 'blocked' || status === 'failed') && (
        <button type="button" className="btn btn--small btn--notice" onClick={() => c.audio.retry()}>
          <Icon name="retry" size={20} />
          {status === 'blocked' ? '点这里开启声音' : '声音没加载好，点这里重试'}
        </button>
      )}
      <button
        type="button"
        className="icon-btn"
        aria-pressed={muted}
        onClick={() => {
          c.audio.unlock();
          c.setSettings({ masterMute: !muted });
        }}
      >
        <Icon name={muted ? 'mute' : 'sound'} />
        <span className="icon-btn__label">{muted ? '已静音' : '声音'}</span>
      </button>
    </>
  );
}

export interface TopBarProps {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  showCoins?: boolean;
  children?: ReactNode;
}

export function TopBar({ title, onBack, backLabel = '返回', showCoins = false, children }: TopBarProps) {
  return (
    <header className="topbar">
      {onBack && (
        <button type="button" className="btn btn--ghost topbar__back" onClick={onBack}>
          <Icon name="back" size={22} />
          {backLabel}
        </button>
      )}
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__actions">
        {children}
        {showCoins && <CoinBadge />}
        <SoundButton />
      </div>
    </header>
  );
}

const SAVE_ISSUE_TEXT = {
  unavailable: '当前无法保存，关闭页面可能丢失进度。',
  quota: '当前无法保存（存储空间不足），关闭页面可能丢失进度。',
  temporary: '临时游玩：存档来自更新版本的游戏，本页面不会保存任何进度，原存档保持不变。',
  error: '保存出现问题，关闭页面可能丢失最近的进度。',
} as const;

export function SaveBanner() {
  const c = useController();
  const [message, setMessage] = useState('');
  const { saveIssue } = useAppState();
  if (!saveIssue) return null;
  return (
    <div className="save-banner" role="alert">
      <Icon name="lock" size={22} />
      <span>{SAVE_ISSUE_TEXT[saveIssue]}</span>
      {saveIssue !== 'temporary' && <button className="btn btn--small" onClick={() => setMessage(c.retrySave() ? '已保存到此浏览器' : '尚未保存，请导出备份并保留页面')}>重试保存</button>}
      <button className="btn btn--small" onClick={() => { try { setMessage(c.exportBackup()); } catch (e) { setMessage(e instanceof Error ? e.message : '下载未能发起，请重试'); } }}>导出当前内存备份</button>
      {message && <span role="status">{message}</span>}
    </div>
  );
}
