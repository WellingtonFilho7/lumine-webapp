export const getRecordFormDefaults = () => ({
  attendance: 'present',
  mood: 'neutral',
  participation: 'medium',
  interaction: 'medium',
  activity: '',
  performance: 'medium',
  notes: '',
  familyContact: 'no',
  contactReason: '',
});

export const buildRecordForm = (record = {}) => ({
  ...getRecordFormDefaults(),
  ...record,
});

export const upsertDailyRecord = (records, data, now = new Date().toISOString()) => {
  const internalId = data.childInternalId || data.childId || '';
  const dateKey = data.date ? data.date.split('T')[0] : '';
  const existingIndex = records.findIndex(
    record => record.childInternalId === internalId && record.date?.split('T')[0] === dateKey
  );

  if (existingIndex >= 0) {
    const existing = records[existingIndex];
    const recordPayload = {
      ...existing,
      ...data,
      childInternalId: internalId,
      childId: internalId,
    };
    const nextRecords = [...records];
    nextRecords[existingIndex] = recordPayload;
    return { recordPayload, nextRecords, existed: true };
  }

  const recordPayload = {
    ...data,
    childInternalId: internalId,
    childId: internalId,
    id: Date.now().toString(),
    createdAt: now,
  };

  return { recordPayload, nextRecords: [...records, recordPayload], existed: false };
};
