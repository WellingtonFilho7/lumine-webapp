import {
  getPendingChangesLabel,
  getPendingSyncBadgeMobileLabel,
  getConnectionIndicatorClass,
  getConnectionLabel,
} from './syncUi';

describe('syncUi helpers', () => {
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
