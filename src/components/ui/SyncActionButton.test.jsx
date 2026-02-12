import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SyncActionButton from './SyncActionButton';

describe('SyncActionButton', () => {
  test('renders mobile syncing variant and handles click', () => {
    const onSync = jest.fn();

    render(
      <SyncActionButton
        variant="mobile"
        syncStateKey="syncing"
        isSyncing
        disabled={false}
        onSync={onSync}
      />
    );

    const button = screen.getByRole('button', { name: 'Sync...' });
    expect(button.className).toContain('bg-cyan-500');

    fireEvent.click(button);
    expect(onSync).toHaveBeenCalledTimes(1);
  });

  test('renders desktop success variant', () => {
    render(
      <SyncActionButton
        variant="desktop"
        syncStateKey="success"
        isSyncing={false}
        disabled={false}
        onSync={jest.fn()}
      />
    );

    const button = screen.getByRole('button', { name: 'Sincronizado' });
    expect(button.className).toContain('bg-emerald-100');
  });
});
