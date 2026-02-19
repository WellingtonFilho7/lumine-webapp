import { useCallback } from 'react';

export default function useRecords({
  apiUrl,
  jsonHeaders,
  isOnline,
  onlineOnly = false,
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
      if (onlineOnly && !isOnline) return false;

      const now = new Date().toISOString();
      const { recordPayload, nextRecords, existed } = upsertDailyRecord(dailyRecords, data, now);

      setDailyRecords(nextRecords);
      setPendingChanges(p => p + 1);

      if (!isOnline) return true;

      if (existed) {
        if (!reviewMode) {
          await syncWithServer({ children, records: nextRecords }, 'auto');
        }
        return true;
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
        return true;
      }

      return true;
    },
    [
      upsertDailyRecord,
      dailyRecords,
      setDailyRecords,
      setPendingChanges,
      onlineOnly,
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
