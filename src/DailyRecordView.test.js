import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DailyRecordView } from './App';

describe('DailyRecordView edit flow', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-21T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('loads record into form when selecting a same-day record', () => {
    const children = [
      {
        id: 'c1',
        name: 'Ana Clara',
        enrollmentStatus: 'matriculado',
      },
    ];

    const dailyRecords = [
      {
        id: 'r1',
        childInternalId: 'c1',
        childId: 'c1',
        date: '2026-01-21',
        attendance: 'present',
        notes: 'observacao importante',
      },
    ];

    render(
      <DailyRecordView
        children={children}
        dailyRecords={dailyRecords}
        addDailyRecord={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText('Ana Clara'));

    expect(screen.getByText('Atualizar registro')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Algo importante...')).toHaveValue('observacao importante');
  });
});
