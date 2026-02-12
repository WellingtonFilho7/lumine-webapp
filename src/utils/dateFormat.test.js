import {
  calculateAge,
  formatDate,
  formatTime,
  calculateAttendanceRate,
} from './dateFormat';

describe('dateFormat helpers', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-15T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('calculates age considering month/day boundaries', () => {
    expect(calculateAge('2016-02-15')).toBe(10);
    expect(calculateAge('2016-02-16T12:00:00.000Z')).toBe(9);
    expect(calculateAge('')).toBe(0);
  });

  test('formats date and time in pt-BR locale', () => {
    const iso = '2026-02-15T12:30:00.000Z';
    expect(formatDate(iso)).toBe('15/02/2026');
    expect(formatTime(iso)).toMatch(/\d{2}:\d{2}/);
    expect(formatDate('')).toBe('N/A');
    expect(formatTime('')).toBe('');
  });

  test('calculates attendance rate with present + late as attendance', () => {
    const records = [
      { attendance: 'present' },
      { attendance: 'late' },
      { attendance: 'absent' },
      { attendance: 'absent' },
    ];

    expect(calculateAttendanceRate(records)).toBe(50);
    expect(calculateAttendanceRate([])).toBe(0);
  });
});
