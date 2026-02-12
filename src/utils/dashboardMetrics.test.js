import { getDashboardStats, getAttendanceAlerts } from './dashboardMetrics';

describe('dashboardMetrics', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-15T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('calculates daily and monthly stats', () => {
    const children = [
      { id: 'c1', enrollmentStatus: 'matriculado' },
      { id: 'c2', enrollmentStatus: 'matriculado' },
      { id: 'c3', enrollmentStatus: 'em_triagem' },
    ];

    const dailyRecords = [
      { id: 'r1', childInternalId: 'c1', date: '2026-02-15', attendance: 'present' },
      { id: 'r2', childInternalId: 'c2', date: '2026-02-15', attendance: 'late' },
      { id: 'r3', childInternalId: 'c1', date: '2026-02-10', attendance: 'present' },
      { id: 'r4', childInternalId: 'c1', date: '2026-01-31', attendance: 'present' },
      { id: 'r5', childInternalId: 'c2', date: '2026-02-05', attendance: 'absent' },
    ];

    expect(getDashboardStats(children, dailyRecords)).toEqual({
      present: 2,
      absent: 0,
      total: 2,
      meals: 3,
    });
  });

  test('creates strong and weak absence alerts for matriculated children', () => {
    const children = [
      {
        id: 'c-strong',
        name: 'Crianca Forte',
        enrollmentStatus: 'matriculado',
        participationDays: ['sex', 'sab', 'dom'],
      },
      {
        id: 'c-weak',
        name: 'Crianca Fraca',
        enrollmentStatus: 'matriculado',
        participationDays: ['sex', 'sab', 'dom'],
      },
      {
        id: 'c-ignore',
        name: 'Nao Matriculada',
        enrollmentStatus: 'em_triagem',
        participationDays: ['sex', 'sab', 'dom'],
      },
    ];

    const dailyRecords = [
      { id: 's1', childInternalId: 'c-strong', date: '2026-02-15', attendance: 'absent' },
      { id: 's2', childInternalId: 'c-strong', date: '2026-02-14', attendance: 'absent' },
      { id: 's3', childInternalId: 'c-strong', date: '2026-02-13', attendance: 'absent' },

      { id: 'w1', childInternalId: 'c-weak', date: '2026-02-15', attendance: 'absent' },
      // 2026-02-14 pending intentionally
      { id: 'w2', childInternalId: 'c-weak', date: '2026-02-13', attendance: 'absent' },
    ];

    const alerts = getAttendanceAlerts(children, dailyRecords);

    expect(alerts).toEqual(
      expect.arrayContaining([
        {
          childId: 'c-strong',
          childName: 'Crianca Forte',
          msg: '3+ faltas confirmadas seguidas',
          severity: 'strong',
        },
        {
          childId: 'c-weak',
          childName: 'Crianca Fraca',
          msg: 'Possível sequência de faltas. Verificar registros pendentes dos últimos encontros.',
          severity: 'weak',
        },
      ])
    );

    expect(alerts.find(a => a.childId === 'c-ignore')).toBeUndefined();
  });
});
