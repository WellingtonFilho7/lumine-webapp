import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DailyRecordDesktop } from './App';

describe('DailyRecordDesktop edit flow', () => {
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
        name: 'Lucas',
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
        notes: 'nota teste',
      },
    ];

    render(
      <DailyRecordDesktop
        children={children}
        dailyRecords={dailyRecords}
        addDailyRecord={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Lucas/i }));

    expect(screen.getByText('Atualizar registro')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Algo importante...')).toHaveValue('nota teste');
  });

  test('keeps success toast visible for around 3 seconds', async () => {
    const children = [
      {
        id: 'c1',
        name: 'Lucas',
        enrollmentStatus: 'matriculado',
      },
    ];
    const addDailyRecord = jest.fn().mockResolvedValue(true);

    render(
      <DailyRecordDesktop
        children={children}
        dailyRecords={[]}
        addDailyRecord={addDailyRecord}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Marcar Lucas como presente/i }));
    });

    expect(screen.getByText('Registro salvo!')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(screen.getByText('Registro salvo!')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(screen.queryByText('Registro salvo!')).not.toBeInTheDocument();
  });
});
