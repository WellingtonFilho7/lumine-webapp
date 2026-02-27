import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MobileNav from './MobileNav';

describe('MobileNav', () => {
  it('renders pending badge on Registro when there are pending items', () => {
    render(<MobileNav view="dashboard" setView={jest.fn()} pendingDailyCount={3} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByLabelText('Registro (3 pendentes)')).toBeInTheDocument();
  });

  it('navigates to daily view when Registro is pressed', () => {
    const setView = jest.fn();
    render(<MobileNav view="dashboard" setView={setView} pendingDailyCount={0} />);

    fireEvent.click(screen.getByLabelText('Registro'));
    expect(setView).toHaveBeenCalledWith('daily');
  });
});
