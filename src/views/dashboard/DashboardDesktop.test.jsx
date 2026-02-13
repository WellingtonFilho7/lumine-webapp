import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DashboardDesktop from './DashboardDesktop';

const baseProps = {
  stats: { present: 0, absent: 0, total: 0, meals: 0 },
  alerts: [],
  children: [],
  dailyRecords: [],
  setSelectedChild: jest.fn(),
  setView: jest.fn(),
  isMatriculated: child => child.enrollmentStatus === 'matriculado',
  formatDate: value => value,
};

describe('DashboardDesktop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows done-state when no pending children exist', () => {
    render(<DashboardDesktop {...baseProps} />);

    expect(screen.getByText('Dia em dia')).not.toBeNull();
    expect(screen.getByText('Tudo registrado por hoje.')).not.toBeNull();
  });

  it('shows pending child and opens daily view on CTA', () => {
    const props = {
      ...baseProps,
      stats: { present: 0, absent: 1, total: 1, meals: 0 },
      children: [
        {
          id: 'child-1',
          name: 'Pedro Alves',
          enrollmentStatus: 'matriculado',
        },
      ],
    };

    render(<DashboardDesktop {...props} />);

    expect(screen.getByText('Pedro Alves')).not.toBeNull();

    fireEvent.click(screen.getByText('Ir para registros'));
    expect(props.setView).toHaveBeenCalledWith('daily');
  });
});
