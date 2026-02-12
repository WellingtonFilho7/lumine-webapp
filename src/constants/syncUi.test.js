import {
  getSyncStateKey,
  isSyncActionDisabled,
  shouldShowPendingSyncBadge,
  getPendingChangesLabel,
  getPendingSyncBadgeMobileLabel,
  getConnectionIndicatorClass,
  getConnectionLabel,
} from './syncUi';

describe('syncUi helpers', () => {
  test('maps unknown sync states to idle', () => {
    expect(getSyncStateKey('syncing')).toBe('syncing');
    expect(getSyncStateKey('success')).toBe('success');
    expect(getSyncStateKey('error')).toBe('error');
    expect(getSyncStateKey('idle')).toBe('idle');
    expect(getSyncStateKey('foo')).toBe('idle');
  });

  test('computes sync action disabled state', () => {
    expect(isSyncActionDisabled('syncing', false)).toBe(true);
    expect(isSyncActionDisabled('idle', true)).toBe(true);
    expect(isSyncActionDisabled('idle', false)).toBe(false);
  });

  test('computes pending sync badge visibility', () => {
    expect(shouldShowPendingSyncBadge(2, 'idle')).toBe(true);
    expect(shouldShowPendingSyncBadge(0, 'idle')).toBe(false);
    expect(shouldShowPendingSyncBadge(2, 'syncing')).toBe(false);
  });

  test('formats pending changes label with singular/plural', () => {
    expect(getPendingChangesLabel(1)).toBe('1 alteração pendente');
    expect(getPendingChangesLabel(3)).toBe('3 alterações pendentes');
  });

  test('formats mobile pending sync badge label', () => {
    expect(getPendingSyncBadgeMobileLabel(2)).toBe('2 não sync');
  });

  test('resolves connection indicator class by variant', () => {
    expect(getConnectionIndicatorClass(true, 'mobile')).toBe('bg-green-400');
    expect(getConnectionIndicatorClass(false, 'mobile')).toBe('bg-red-400');
    expect(getConnectionIndicatorClass(true, 'desktop')).toBe('bg-emerald-400');
    expect(getConnectionIndicatorClass(false, 'desktop')).toBe('bg-rose-400');
  });

  test('resolves connection label', () => {
    expect(getConnectionLabel(true)).toBe('Online');
    expect(getConnectionLabel(false)).toBe('Offline');
  });
});
