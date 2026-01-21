import { buildRecordForm, getRecordFormDefaults, upsertDailyRecord } from './records';

test('buildRecordForm merges defaults with existing record', () => {
  const defaults = getRecordFormDefaults();
  const record = { attendance: 'late', mood: 'happy', notes: 'x' };
  expect(buildRecordForm(record)).toEqual({ ...defaults, ...record });
});

test('upsertDailyRecord updates existing record for same child/date', () => {
  const now = '2026-01-21T10:00:00.000Z';
  const existing = {
    id: '1',
    createdAt: '2026-01-20T10:00:00.000Z',
    childInternalId: 'c1',
    date: '2026-01-21',
    attendance: 'present',
  };
  const result = upsertDailyRecord(
    [existing],
    {
      childInternalId: 'c1',
      date: '2026-01-21',
      attendance: 'absent',
    },
    now
  );
  expect(result.existed).toBe(true);
  expect(result.nextRecords).toHaveLength(1);
  expect(result.nextRecords[0].attendance).toBe('absent');
  expect(result.nextRecords[0].id).toBe('1');
  expect(result.recordPayload.id).toBe('1');
});

test('upsertDailyRecord inserts new record when no match', () => {
  const now = '2026-01-21T10:00:00.000Z';
  const result = upsertDailyRecord(
    [],
    {
      childInternalId: 'c2',
      date: '2026-01-21',
      attendance: 'present',
    },
    now
  );
  expect(result.existed).toBe(false);
  expect(result.nextRecords).toHaveLength(1);
  expect(result.nextRecords[0].id).toBeTruthy();
  expect(result.nextRecords[0].createdAt).toBe(now);
});
