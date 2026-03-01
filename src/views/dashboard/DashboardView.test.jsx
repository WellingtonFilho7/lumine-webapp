import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import DashboardView from './DashboardView';

const defaultProps = {
  stats: { present: 0, absent: 0, total: 0, meals: 0 },
  alerts: [],
  children: [],
  dailyRecords: [],
  setSelectedChild: jest.fn(),
  setView: jest.fn(),
  onQuickAttendance: jest.fn().mockResolvedValue(true),
  quickAttendanceLoadingByChildId: {},
  isMatriculated: child => child.enrollmentStatus === 'matriculado',
};

describe('DashboardView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows done-state and empty-state when there are no pending children or records', () => {
    render(<DashboardView {...defaultProps} />);

    expect(screen.getByText('Dia em dia')).not.toBeNull();
    expect(screen.getByText('Nenhum registro feito hoje.')).not.toBeNull();
  });

  it('shows pending child and navigates to daily records', () => {
    const props = {
      ...defaultProps,
      stats: { present: 0, absent: 1, total: 1, meals: 0 },
      children: [
        {
          id: 'child-1',
          name: 'Ana Maria',
          enrollmentStatus: 'matriculado',
        },
      ],
    };

    render(<DashboardView {...props} />);

    expect(screen.getByText('Ana Maria')).not.toBeNull();

    fireEvent.click(screen.getByText('Registrar agora'));

    expect(props.setView).toHaveBeenCalledWith('daily');
  });

  it('calls quick attendance action for pending child', async () => {
    const props = {
      ...defaultProps,
      stats: { present: 0, absent: 1, total: 1, meals: 0 },
      children: [
        {
          id: 'child-1',
          name: 'Ana Maria',
          enrollmentStatus: 'matriculado',
        },
      ],
    };

    render(<DashboardView {...props} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Marcar Ana Maria como presente'));
    });

    expect(props.onQuickAttendance).toHaveBeenCalledWith('child-1', 'present');
  });

  it('disables quick attendance buttons while child is saving', () => {
    const props = {
      ...defaultProps,
      stats: { present: 0, absent: 1, total: 1, meals: 0 },
      quickAttendanceLoadingByChildId: { 'child-1': true },
      children: [
        {
          id: 'child-1',
          name: 'Ana Maria',
          enrollmentStatus: 'matriculado',
        },
      ],
    };

    render(<DashboardView {...props} />);

    expect(screen.getByLabelText('Marcar Ana Maria como presente').hasAttribute('disabled')).toBe(true);
    expect(screen.getByLabelText('Marcar Ana Maria como ausente').hasAttribute('disabled')).toBe(true);
  });
});
