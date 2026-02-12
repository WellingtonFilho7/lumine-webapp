import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  SYNC_BUTTON_THEME_MOBILE,
  SYNC_BUTTON_LABEL_MOBILE,
  SYNC_BUTTON_THEME_DESKTOP,
  SYNC_BUTTON_LABEL_DESKTOP,
} from '../../constants/syncUi';

const VARIANT_BASE_CLASSES = {
  mobile: 'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
  desktop: 'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition',
};

export default function SyncActionButton({
  variant = 'mobile',
  syncStateKey,
  isSyncing,
  disabled,
  onSync,
}) {
  const isDesktop = variant === 'desktop';
  const label = isDesktop
    ? SYNC_BUTTON_LABEL_DESKTOP[syncStateKey]
    : SYNC_BUTTON_LABEL_MOBILE[syncStateKey];
  const themeClass = isDesktop
    ? SYNC_BUTTON_THEME_DESKTOP[syncStateKey]
    : SYNC_BUTTON_THEME_MOBILE[syncStateKey];

  return (
    <button
      type="button"
      onClick={onSync}
      disabled={disabled}
      className={cn(VARIANT_BASE_CLASSES[variant] || VARIANT_BASE_CLASSES.mobile, themeClass)}
    >
      <RefreshCw size={14} className={cn(isSyncing && 'animate-spin')} />
      {label}
    </button>
  );
}
