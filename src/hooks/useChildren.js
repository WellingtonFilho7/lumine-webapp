import { useCallback } from 'react';

export default function useChildren({
  apiUrl,
  jsonHeaders,
  isOnline,
  onlineOnly = false,
  children = [],
  dailyRecords = [],
  syncWithServer,
  normalizeChild,
  setChildren,
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
        id: Date.now().toString(),
        createdAt: now,
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

      if (onlineOnly) {
        try {
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({ action: 'addChild', data: newChild }),
          });
          const result = await res.json().catch(() => null);
          if (!res.ok || !result?.success) return false;

          const persistedChild = {
            ...newChild,
            ...(result?.childId ? { childId: result.childId } : {}),
          };

          setChildren(prev => [...prev, persistedChild]);
          if (typeof result?.dataRev === 'number') {
            setDataRev(result.dataRev);
          }
          setLastSync(new Date().toISOString());
          return true;
        } catch {
          return false;
        }
      }

      setChildren(prev => [...prev, newChild]);
      setPendingChanges(p => p + 1);

      if (isOnline) {
        try {
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({ action: 'addChild', data: newChild }),
          });
          const result = await res.json().catch(() => null);
          if (!res.ok || !result?.success) {
            throw new Error(result?.error || result?.details || `Erro HTTP ${res.status}`);
          }

          if (result?.childId) {
            setChildren(prev =>
              prev.map(child =>
                child.id === newChild.id ? { ...child, childId: result.childId } : child
              )
            );
          }
          if (typeof result?.dataRev === 'number') {
            setDataRev(result.dataRev);
          }

          setPendingChanges(prev => Math.max(0, prev - 1));
          setLastSync(new Date().toISOString());
        } catch {
          return true;
        }
      }

      return true;
    },
    [
      apiUrl,
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

      if (onlineOnly) {
        const nextChildren = children.map(child => {
          if (child.id !== childId) return child;
          const merged = { ...child, ...updatedData };
          return normalizeChild(merged).child;
        });

        const ok = await syncWithServer(
          {
            children: nextChildren,
            records: dailyRecords,
          },
          'auto'
        );

        if (!ok) return false;

        setChildren(nextChildren);
        setSelectedChild(prev => {
          if (!prev || prev.id !== childId) return prev;
          const selected = nextChildren.find(child => child.id === childId);
          return selected || prev;
        });
        return true;
      }

      setChildren(prev =>
        prev.map(child => {
          if (child.id !== childId) return child;
          const merged = { ...child, ...updatedData };
          return normalizeChild(merged).child;
        })
      );

      setSelectedChild(prev => {
        if (!prev || prev.id !== childId) return prev;
        const merged = { ...prev, ...updatedData };
        return normalizeChild(merged).child;
      });

      setPendingChanges(p => p + 1);
      return true;
    },
    [
      onlineOnly,
      isOnline,
      children,
      dailyRecords,
      syncWithServer,
      setChildren,
      setSelectedChild,
      setPendingChanges,
      normalizeChild,
    ]
  );

  return {
    addChild,
    updateChild,
  };
}
