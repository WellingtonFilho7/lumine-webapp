import React from 'react';
import { cn } from '../../utils/cn';

const VARIANT_STYLES = {
  mobile: {
    wrapper: 'mt-1 flex items-start justify-between gap-2',
    textBase: 'text-xs',
    critical: 'text-rose-100 font-semibold',
    warning: 'text-amber-100',
    button: 'rounded border border-white/30 px-2 py-0.5 text-[10px] font-semibold text-white/90',
  },
  desktop: {
    wrapper: 'mt-1 flex items-center gap-2',
    textBase: 'text-pretty text-xs',
    critical: 'text-rose-700 font-semibold',
    warning: 'text-amber-800',
    button: 'rounded border border-rose-300 px-2 py-0.5 text-[10px] font-semibold text-rose-700',
  },
};

export default function SyncErrorNotice({
  syncStatus,
  syncError,
  syncErrorLevel,
  onClear,
  variant = 'mobile',
}) {
  if (syncStatus !== 'error' || !syncError) return null;

  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.mobile;

  return (
    <div className={styles.wrapper}>
      <p
        role="status"
        aria-live="polite"
        className={cn(
          styles.textBase,
          syncErrorLevel === 'critical' ? styles.critical : styles.warning
        )}
      >
        Sync: {syncError}
      </p>
      {syncErrorLevel === 'critical' && (
        <button type="button" onClick={onClear} className={styles.button}>
          Limpar
        </button>
      )}
    </div>
  );
}
