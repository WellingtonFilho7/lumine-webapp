import { useCallback } from 'react';

export default function useChildren({
  apiBaseUrl,
  jsonHeaders,
  isOnline,
  onlineOnly = false,
  children = [],
  normalizeChild,
  setChildren,
  setDailyRecords,
  setSelectedChild,
  setPendingChanges,
  setDataRev,
  setLastSync,
}) {
  const addChild = useCallback(
    async data => {
      if (onlineOnly && !isOnline) return false;

      const now = new Date().toISOString();
      const enrollmentStatus = data.enrollmentStatus || 'matriculado';
      const entryDate =
        enrollmentStatus === 'matriculado'
          ? data.entryDate || new Date().toISOString().split('T')[0]
          : data.entryDate || '';

      const baseChild = {
        ...data,
        id: data.id || Date.now().toString(),
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || null,
        entryDate,
        enrollmentStatus,
        enrollmentDate: data.enrollmentDate || now,
        matriculationDate:
          enrollmentStatus === 'matriculado'
            ? data.matriculationDate || data.enrollmentDate || now
            : data.matriculationDate || '',
        startDate:
          enrollmentStatus === 'matriculado' ? data.startDate || entryDate : data.startDate || '',
        documentsReceived: data.documentsReceived || [],
        enrollmentHistory:
          Array.isArray(data.enrollmentHistory) && data.enrollmentHistory.length
            ? data.enrollmentHistory
            : [{ date: now, action: enrollmentStatus, notes: 'Cadastro inicial' }],
      };

      const newChild = normalizeChild(baseChild).child;

      if (!isOnline) {
        if (onlineOnly) return false;
        setChildren(prev => [...prev, newChild]);
        setPendingChanges(p => p + 1);
        return true;
      }

      try {
        const res = await fetch(`${apiBaseUrl}/children/create`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ data: newChild }),
        });
        const result = await res.json().catch(() => null);
        if (!res.ok || !result?.success) return false;

        const dataPayload = result?.data || {};
        const persistedChild = normalizeChild({
          ...newChild,
          ...(dataPayload.child || {}),
          ...(dataPayload.childId ? { childId: dataPayload.childId } : {}),
          ...(dataPayload.updatedAt ? { updatedAt: dataPayload.updatedAt } : {}),
        }).child;

        setChildren(prev => [...prev, persistedChild]);
        if (typeof dataPayload?.dataRev === 'number') {
          setDataRev(dataPayload.dataRev);
        }
        setLastSync(new Date().toISOString());
        return true;
      } catch {
        return false;
      }
    },
    [
      apiBaseUrl,
      jsonHeaders,
      isOnline,
      onlineOnly,
      normalizeChild,
      setChildren,
      setPendingChanges,
      setDataRev,
      setLastSync,
    ]
  );

  const updateChild = useCallback(
    async (childId, updatedData) => {
      if (onlineOnly && !isOnline) return false;

      const currentChild = children.find(child => child.id === childId);
      if (!currentChild) return false;

      const normalizedPatch = normalizeChild({ ...currentChild, ...updatedData }).child;

      if (!isOnline) {
        if (onlineOnly) return false;

        setChildren(prev =>
          prev.map(child => {
            if (child.id !== childId) return child;
            return normalizedPatch;
          })
        );
        setSelectedChild(prev => {
          if (!prev || prev.id !== childId) return prev;
          return normalizedPatch;
        });
        setPendingChanges(p => p + 1);
        return true;
      }

      try {
        const res = await fetch(`${apiBaseUrl}/children/update`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            childId,
            ifUnmodifiedSince: currentChild.updatedAt || null,
            data: normalizedPatch,
          }),
        });
        const result = await res.json().catch(() => null);
        if (!res.ok || !result?.success) return false;

        const dataPayload = result?.data || {};
        const persistedChild = normalizeChild({
          ...normalizedPatch,
          ...(dataPayload.child || {}),
          ...(dataPayload.childId ? { childId: dataPayload.childId } : {}),
          ...(dataPayload.updatedAt ? { updatedAt: dataPayload.updatedAt } : {}),
        }).child;

        setChildren(prev => prev.map(child => (child.id === childId ? persistedChild : child)));
        setSelectedChild(prev => {
          if (!prev || prev.id !== childId) return prev;
          return persistedChild;
        });

        if (typeof dataPayload?.dataRev === 'number') {
          setDataRev(dataPayload.dataRev);
        }
        setLastSync(new Date().toISOString());
        return true;
      } catch {
        return false;
      }
    },
    [
      onlineOnly,
      isOnline,
      children,
      apiBaseUrl,
      jsonHeaders,
      setChildren,
      setSelectedChild,
      setPendingChanges,
      normalizeChild,
      setDataRev,
      setLastSync,
    ]
  );

  const deleteChild = useCallback(
    async childId => {
      if (!childId) return false;
      if (onlineOnly && !isOnline) return false;

      if (!isOnline) {
        setChildren(prev => prev.filter(child => child.id !== childId));
        if (typeof setDailyRecords === 'function') {
          setDailyRecords(prev =>
            prev.filter(record => (record.childInternalId || record.childId) !== childId)
          );
        }
        setSelectedChild(prev => (prev?.id === childId ? null : prev));
        setPendingChanges(p => p + 1);
        return true;
      }

      try {
        const res = await fetch(`${apiBaseUrl}/children/delete`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ childId }),
        });
        const result = await res.json().catch(() => null);
        if (!res.ok || !result?.success) {
          throw new Error(result?.error || result?.details || `Erro HTTP ${res.status}`);
        }

        setChildren(prev => prev.filter(child => child.id !== childId));
        if (typeof setDailyRecords === 'function') {
          setDailyRecords(prev =>
            prev.filter(record => (record.childInternalId || record.childId) !== childId)
          );
        }
        setSelectedChild(prev => (prev?.id === childId ? null : prev));

        const dataPayload = result?.data || {};
        if (typeof dataPayload?.dataRev === 'number') {
          setDataRev(dataPayload.dataRev);
        }

        setLastSync(new Date().toISOString());
        return true;
      } catch (error) {
        console.error('Falha ao excluir cadastro de criança', error);
        return false;
      }
    },
    [
      apiBaseUrl,
      isOnline,
      jsonHeaders,
      onlineOnly,
      setChildren,
      setDailyRecords,
      setSelectedChild,
      setPendingChanges,
      setDataRev,
      setLastSync,
    ]
  );

  return {
    addChild,
    deleteChild,
    updateChild,
  };
}
