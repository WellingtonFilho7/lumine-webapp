import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConfigView } from './App';

const noop = () => {};

test('shows onboarding card and triggers reopen', () => {
  const onOpenOnboarding = jest.fn();

  render(
    <ConfigView
      children={[]}
      setChildren={noop}
      dailyRecords={[]}
      setDailyRecords={noop}
      syncWithServer={noop}
      downloadFromServer={noop}
      lastSync={null}
      isOnline={true}
      overwriteBlocked={false}
      clearLocalData={noop}
      reviewMode={false}
      setReviewMode={noop}
      onOpenOnboarding={onOpenOnboarding}
    />
  );

  expect(screen.getAllByText('Guia rápida (3 passos)').length).toBeGreaterThan(0);
  const reopenButtons = screen.getAllByText('Reabrir guia rápida');
  fireEvent.click(reopenButtons[0]);
  expect(onOpenOnboarding).toHaveBeenCalledTimes(1);
});
