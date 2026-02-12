import { useState, useRef, useCallback, useEffect } from 'react';
import { classifySyncError } from '../utils/syncErrors';
import {
  AUTO_SYNC_DELAY_MS,
  AUTO_SYNC_RETRY_INTERVAL_MS,
  SYNC_SUCCESS_RESET_TIMEOUT_MS,
  SYNC_WARNING_RESET_TIMEOUT_MS,
} from '../constants';

export default function useSync({
  apiUrl,
  baseHeaders,
  jsonHeaders,
  children,
  dailyRecords,
  isOnline,
  dataRev,
  setDataRev,
  setLastSync,
  setChildren,
  setDailyRecords,
  normalizeChildren,
  normalizeRecords,
  pendingChanges,
  setPendingChanges,
  reviewMode,
}) {
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncError, setSyncError] = useState('');
  const [syncErrorLevel, setSyncErrorLevel] = useState('none');
  const [overwriteBlocked, setOverwriteBlocked] = useState(false);
  const [syncModal, setSyncModal] = useState(null);

  const syncStatusTimerRef = useRef(null);

  const clearSyncStatusTimer = useCallback(() => {
    if (syncStatusTimerRef.current) {
      clearTimeout(syncStatusTimerRef.current);
      syncStatusTimerRef.current = null;
    }
  }, []);

  const scheduleSyncStatusReset = useCallback(
    ms => {
      clearSyncStatusTimer();
      if (ms > 0) {
        syncStatusTimerRef.current = setTimeout(() => {
          setSyncStatus('idle');
          syncStatusTimerRef.current = null;
        }, ms);
      }
    },
    [clearSyncStatusTimer]
  );

  const clearSyncFeedback = useCallback(() => {
    clearSyncStatusTimer();
    setSyncStatus('idle');
    setSyncError('');
    setSyncErrorLevel('none');
  }, [clearSyncStatusTimer]);

  const beginSync = useCallback(() => {
    clearSyncStatusTimer();
    setSyncStatus('syncing');
    setSyncError('');
    setSyncErrorLevel('none');
  }, [clearSyncStatusTimer]);

  const applySyncError = useCallback(
    ({ message, level, autoDismissMs }) => {
      setSyncError(message);
      setSyncErrorLevel(level || 'warning');
      setSyncStatus('error');
      scheduleSyncStatusReset(autoDismissMs || 0);
    },
    [scheduleSyncStatusReset]
  );

  const applySyncSuccess = useCallback(() => {
    setSyncError('');
    setSyncErrorLevel('none');
    setSyncStatus('success');
    scheduleSyncStatusReset(SYNC_SUCCESS_RESET_TIMEOUT_MS);
  }, [scheduleSyncStatusReset]);

  const syncWithServer = useCallback(
    async (payload = null, mode = 'manual') => {
      if (!isOnline) {
        applySyncError(classifySyncError({ isOnline: false }));
        return false;
      }

      if (overwriteBlocked && !payload) {
        applySyncError({
          message: 'Baixe os dados antes de sincronizar.',
          level: 'warning',
          autoDismissMs: SYNC_WARNING_RESET_TIMEOUT_MS,
        });
        return false;
      }

      beginSync();

      const localRevBefore = Number(dataRev) || 0;
      let serverRev = localRevBefore;

      try {
        const preRes = await fetch(apiUrl, { headers: baseHeaders });
        let preData = null;
        try {
          preData = await preRes.json();
        } catch {
          preData = null;
        }
        if (preRes.ok && preData?.success) {
          if (typeof preData.dataRev === 'number') {
            serverRev = preData.dataRev;
            setDataRev(serverRev);
          }
          setOverwriteBlocked(false);

          if (serverRev > localRevBefore) {
            if (mode === 'manual') {
              setSyncModal({
                type: 'server-new',
                message: 'Há dados novos no servidor. Baixe os dados atuais antes de sincronizar.',
              });
            } else {
              setOverwriteBlocked(true);
              applySyncError({
                message: 'Há dados novos no servidor. Toque em Baixar para atualizar.',
                level: 'warning',
                autoDismissMs: SYNC_WARNING_RESET_TIMEOUT_MS,
              });
            }
            return false;
          }
        }
      } catch {
        // Ignora falha no pré-check e tenta sincronizar normalmente.
      }

      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            action: 'sync',
            ifMatchRev: serverRev,
            data: payload || { children, records: dailyRecords },
          }),
        });

        let result = null;
        try {
          result = await res.json();
        } catch {
          result = null;
        }

        if (!res.ok || !result?.success) {
          const classifiedError = classifySyncError({
            isOnline,
            status: res.status,
            payloadError: result?.error,
            details: result?.details,
            fallbackMessage: result?.message || `Erro HTTP ${res.status}`,
          });

          if (res.status === 409 && result?.error === 'REVISION_MISMATCH') {
            if (mode === 'manual') {
              setSyncModal({
                type: 'revision-mismatch',
                message: 'Os dados foram alterados por outro dispositivo. Baixe a versão atual.',
              });
            } else {
              setOverwriteBlocked(true);
              applySyncError(classifiedError);
            }
            return false;
          }

          if (res.status === 409 && result?.error === 'DATA_LOSS_PREVENTED') {
            const serverCount = result?.serverCount || {};
            setOverwriteBlocked(true);
            applySyncError({
              ...classifiedError,
              message: `Servidor tem mais dados (Crianças: ${serverCount.children || 0}, Registros: ${serverCount.records || 0}). Baixe antes de sincronizar.`,
            });
            return false;
          }

          applySyncError(classifiedError);
          return false;
        }

        if (typeof result?.dataRev === 'number') {
          setDataRev(result.dataRev);
        }
        setOverwriteBlocked(false);
        setSyncError('');
        setLastSync(new Date().toISOString());

        if (payload) {
          setPendingChanges(prev => Math.max(0, prev - 1));
        } else {
          setPendingChanges(0);
        }

        applySyncSuccess();
        return true;
      } catch (error) {
        applySyncError(
          classifySyncError({
            isOnline,
            fallbackMessage: error?.message || 'Erro na sincronização',
          })
        );
        return false;
      }
    },
    [
      isOnline,
      overwriteBlocked,
      beginSync,
      dataRev,
      apiUrl,
      baseHeaders,
      setDataRev,
      applySyncError,
      jsonHeaders,
      children,
      dailyRecords,
      setLastSync,
      setPendingChanges,
      applySyncSuccess,
    ]
  );

  const downloadFromServer = useCallback(async () => {
    if (!isOnline) {
      applySyncError(classifySyncError({ isOnline: false }));
      return false;
    }

    beginSync();
    try {
      const res = await fetch(apiUrl, { headers: baseHeaders });
      let result = null;
      try {
        result = await res.json();
      } catch {
        result = null;
      }

      if (!res.ok || !result?.success) {
        applySyncError(
          classifySyncError({
            isOnline,
            status: res.status,
            payloadError: result?.error,
            details: result?.details,
            fallbackMessage: result?.message || `Erro HTTP ${res.status}`,
          })
        );
        return false;
      }

      if (result.data) {
        if (Array.isArray(result.data.children)) {
          const normalized = normalizeChildren(result.data.children).children;
          setChildren(normalized);
        }
        if (Array.isArray(result.data.records)) {
          const normalizedRecords = normalizeRecords(result.data.records).records;
          setDailyRecords(normalizedRecords);
        }
        setPendingChanges(0);
      }

      if (typeof result?.dataRev === 'number') setDataRev(result.dataRev);
      setOverwriteBlocked(false);
      setLastSync(new Date().toISOString());
      applySyncSuccess();
      return true;
    } catch (error) {
      applySyncError(
        classifySyncError({
          isOnline,
          fallbackMessage: error?.message || 'Erro ao baixar dados',
        })
      );
      return false;
    }
  }, [
    isOnline,
    beginSync,
    apiUrl,
    baseHeaders,
    applySyncError,
    normalizeChildren,
    setChildren,
    normalizeRecords,
    setDailyRecords,
    setPendingChanges,
    setDataRev,
    setLastSync,
    applySyncSuccess,
  ]);

  useEffect(() => {
    if (isOnline && pendingChanges > 0 && !overwriteBlocked && !reviewMode) {
      const timer = setTimeout(() => {
        syncWithServer(null, 'auto');
      }, AUTO_SYNC_DELAY_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOnline, pendingChanges, overwriteBlocked, reviewMode, syncWithServer]);

  useEffect(() => {
    if (isOnline && pendingChanges > 0 && !overwriteBlocked && !reviewMode) {
      const interval = setInterval(() => syncWithServer(null, 'auto'), AUTO_SYNC_RETRY_INTERVAL_MS);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isOnline, pendingChanges, overwriteBlocked, reviewMode, syncWithServer]);

  useEffect(() => () => clearSyncStatusTimer(), [clearSyncStatusTimer]);

  return {
    syncStatus,
    syncError,
    syncErrorLevel,
    overwriteBlocked,
    syncModal,
    setSyncModal,
    clearSyncFeedback,
    syncWithServer,
    downloadFromServer,
  };
}
