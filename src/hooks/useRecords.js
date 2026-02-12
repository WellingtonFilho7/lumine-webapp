import { useCallback } from 'react';

export default function useRecords({
  apiUrl,
  jsonHeaders,
  isOnline,
  reviewMode,
  children,
  dailyRecords,
  setDailyRecords,
  setPendingChanges,
  setDataRev,
  setLastSync,
  syncWithServer,
  upsertDailyRecord,
}) {
  const addDailyRecord = useCallback(
    async data => {
      const now = new Date().toISOString();
      const { recordPayload, nextRecords, existed } = upsertDailyRecord(dailyRecords, data, now);

      setDailyRecords(nextRecords);
      setPendingChanges(p => p + 1);

      if (!isOnline) return;

      if (existed) {
        if (!reviewMode) {
          await syncWithServer({ children, records: nextRecords }, 'auto');
        }
        return;
      }

      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ action: 'addRecord', data: recordPayload }),
        });
        const result = await res.json().catch(() => null);
        if (!res.ok || !result?.success) {
          throw new Error(result?.error || result?.details || `Erro HTTP ${res.status}`);
        }
        if (typeof result?.dataRev === 'number') {
          setDataRev(result.dataRev);
        }
        setPendingChanges(prev => Math.max(0, prev - 1));
        setLastSync(new Date().toISOString());
      } catch {
        return;
      }
    },
    [
      upsertDailyRecord,
      dailyRecords,
      setDailyRecords,
      setPendingChanges,
      isOnline,
      reviewMode,
      syncWithServer,
      children,
      apiUrl,
      jsonHeaders,
      setDataRev,
      setLastSync,
    ]
  );

  return {
    addDailyRecord,
  };
}
