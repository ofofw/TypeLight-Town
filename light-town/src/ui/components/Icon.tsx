import type { ReactNode } from 'react';

export type IconName =
  | 'coin'
  | 'sound'
  | 'mute'
  | 'pause'
  | 'play'
  | 'help'
  | 'home'
  | 'back'
  | 'gear'
  | 'hanger'
  | 'route'
  | 'star'
  | 'parent'
  | 'lock'
  | 'check'
  | 'left'
  | 'right'
  | 'close'
  | 'retry'
  | 'replay'
  | 'resident';

const PATHS: Record<IconName, ReactNode> = {
  coin: (
    <>
      <circle cx="12" cy="12" r="9" fill="#FFD56B" stroke="#B9791F" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="#E0A33A" strokeWidth="1.2" />
      <path d="M12 7.6c1.6 1.9 2.4 3.3 2.4 4.6a2.4 2.4 0 0 1-4.8 0c0-1.3.8-2.7 2.4-4.6Z" fill="#FFF4C7" stroke="#B9791F" strokeWidth="1" />
    </>
  ),
  sound: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
      <path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
      <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  pause: (
    <>
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9.3 9.4a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2.9-1.2 1.8v.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1.2" fill="currentColor" />
    </>
  ),
  home: <path d="M4 11.5L12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  back: <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
  gear: (
    <>
      <path
        d="M12 3.5l1.6 2.2 2.7-.6.6 2.7 2.2 1.6-1.1 2.6 1.1 2.6-2.2 1.6-.6 2.7-2.7-.6L12 20.5l-1.6-2.2-2.7.6-.6-2.7-2.2-1.6L6 12 4.9 9.4l2.2-1.6.6-2.7 2.7.6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  hanger: (
    <path
      d="M12 8.5a2 2 0 1 1 2-2M12 8.5v1.3L3.8 15.6a1.3 1.3 0 0 0 .8 2.4h14.8a1.3 1.3 0 0 0 .8-2.4L12 9.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  route: (
    <>
      <path d="M6 18c0-4 12-2 12-6s-8-2-8-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeDasharray="2.5 2.5" strokeLinecap="round" />
      <circle cx="6" cy="18" r="2.2" fill="currentColor" />
      <circle cx="10" cy="5.5" r="2.2" fill="currentColor" />
    </>
  ),
  star: <path d="M12 3.8l2.3 5 5.4.6-4 3.7 1.1 5.3L12 15.7l-4.8 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="currentColor" />,
  parent: (
    <>
      <circle cx="8.5" cy="8" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 19c.4-3.2 2.3-5.2 5-5.2s4.6 2 5 5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16.5" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14.6 14.7c.6-.3 1.2-.4 1.9-.4 2.2 0 3.7 1.7 4 4.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  lock: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="12" cy="15" r="1.4" fill="currentColor" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />,
  left: <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
  right: <path d="M9.5 5.5L16 12l-6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />,
  retry: (
    <>
      <path d="M18.5 12a6.5 6.5 0 1 1-2-4.7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M17.5 3.8v4.5H13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  replay: (
    <>
      <path d="M5.2 13.5A7 7 0 1 0 7.4 7" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M4.6 4.4v3.9h3.9" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.4 9.2v5.6l4.6-2.8z" fill="currentColor" />
    </>
  ),
  // 新居民入住：亮起的窗户里有一个小小的人影（2026-11-17 居民入住里程碑）。
  resident: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="1.8" fill="#FFE9A8" stroke="#B9791F" strokeWidth="1.6" />
      <circle cx="12" cy="10" r="2.1" fill="#B9791F" />
      <path d="M8.4 19.5c.4-2.6 1.9-4 3.6-4s3.2 1.4 3.6 4" fill="#B9791F" />
    </>
  ),
};

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className ? `icon ${className}` : 'icon'} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
