import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SyncErrorNotice from './SyncErrorNotice';

describe('SyncErrorNotice', () => {
  test('does not render when sync is not in error state', () => {
    const { container } = render(
      <SyncErrorNotice
        syncStatus="idle"
        syncError=""
        syncErrorLevel="none"
        onClear={jest.fn()}
        variant="mobile"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders message and clear button for critical error', () => {
    const onClear = jest.fn();

    render(
      <SyncErrorNotice
        syncStatus="error"
        syncError="Token invalido"
        syncErrorLevel="critical"
        onClear={onClear}
        variant="desktop"
      />
    );

    expect(screen.getByText('Sync: Token invalido')).toBeTruthy();

    const btn = screen.getByRole('button', { name: 'Limpar' });
    fireEvent.click(btn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
