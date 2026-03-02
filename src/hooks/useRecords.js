import { useCallback } from 'react';

export default function useRecords({
  apiBaseUrl,
  jsonHeaders,
  isOnline,
  onlineOnly = false,
  dailyRecords,
  setDailyRecords,
  setPendingChanges,
  setDataRev,
  setLastSync,
  upsertDailyRecord,
}) {
  const addDailyRecord = useCallback(
    async data => {
      if (onlineOnly && !isOnline) return false;

      const now = new Date().toISOString();
      const { recordPayload, nextRecords } = upsertDailyRecord(dailyRecords, data, now);

      if (!isOnline) {
        setDailyRecords(nextRecords);
        setPendingChanges(p => p + 1);
        return true;
      }

      const existingRecord = dailyRecords.find(record => record.id === recordPayload.id);

      try {
        const res = await fetch(`${apiBaseUrl}/records/upsert`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            ifUnmodifiedSince: existingRecord?.updatedAt || null,
            data: recordPayload,
          }),
        });
        const result = await res.json().catch(() => null);
        if (!res.ok || !result?.success) {
          throw new Error(result?.error || result?.message || `Erro HTTP ${res.status}`);
        }

        const dataPayload = result?.data || {};
        const persistedRecord = {
          ...recordPayload,
          ...(dataPayload.record || {}),
          ...(dataPayload.updatedAt ? { updatedAt: dataPayload.updatedAt } : {}),
        };

        setDailyRecords(prev => {
          const index = prev.findIndex(record => record.id === persistedRecord.id);
          if (index === -1) return [...prev, persistedRecord];
          const next = [...prev];
          next[index] = persistedRecord;
          return next;
        });

        if (typeof dataPayload?.dataRev === 'number') {
          setDataRev(dataPayload.dataRev);
        }
        setLastSync(new Date().toISOString());
        return true;
      } catch (error) {
        console.error('Falha ao sincronizar registro diário', error);
        return false;
      }
    },
    [
      upsertDailyRecord,
      dailyRecords,
      setDailyRecords,
      setPendingChanges,
      onlineOnly,
      isOnline,
      apiBaseUrl,
      jsonHeaders,
      setDataRev,
      setLastSync,
    ]
  );

  return {
    addDailyRecord,
  };
}
