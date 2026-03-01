import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DailyRecordView from './DailyRecordView';

const defaultProps = {
  children: [
    {
      id: 'child-1',
      name: 'Ana Maria',
      enrollmentStatus: 'matriculado',
      participationDays: [],
    },
  ],
  dailyRecords: [],
  addDailyRecord: jest.fn().mockResolvedValue(true),
  isOnline: true,
  onlineOnly: true,
  isMatriculated: child => child.enrollmentStatus === 'matriculado',
  formatDate: value => value,
};

describe('DailyRecordView', () => {
  it('hides full date picker by default and toggles it on demand', () => {
    render(<DailyRecordView {...defaultProps} />);

    expect(screen.queryByLabelText('Selecionar data manualmente')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Escolher data' }));

    expect(screen.getByLabelText('Selecionar data manualmente')).not.toBeNull();
  });
});
