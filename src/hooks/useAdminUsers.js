import { useCallback, useEffect, useMemo, useState } from 'react';

function getErrorMessage(status, body, fallback) {
  if (body?.message) return body.message;
  if (status === 401) return 'Sessão inválida. Entre novamente.';
  if (status === 403) return 'Acesso restrito a administradores.';
  if (status === 404) return 'Usuário não encontrado.';
  return fallback;
}

export default function useAdminUsers({
  apiBaseUrl = '',
  jsonHeaders = {},
  enabled = false,
}) {
  const [checkedAccess, setCheckedAccess] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [loadingPendingUsers, setLoadingPendingUsers] = useState(false);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [roleByUserId, setRoleByUserId] = useState({});
  const [approvingById, setApprovingById] = useState({});
  const [adminUsersError, setAdminUsersError] = useState('');
  const [adminUsersNotice, setAdminUsersNotice] = useState('');

  const pendingUrl = useMemo(() => {
    if (!apiBaseUrl) return '';
    return `${apiBaseUrl}/admin/internal-users/pending`;
  }, [apiBaseUrl]);

  const approveUrl = useMemo(() => {
    if (!apiBaseUrl) return '';
    return `${apiBaseUrl}/admin/internal-users/approve`;
  }, [apiBaseUrl]);

  const loadPendingUsers = useCallback(async () => {
    if (!enabled || !pendingUrl) return { ok: false, skipped: true };

    setLoadingPendingUsers(true);
    setAdminUsersError('');
    setAdminUsersNotice('');

    try {
      const response = await fetch(pendingUrl, {
        method: 'GET',
        headers: jsonHeaders,
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (response.status === 403) {
        setCanManageUsers(false);
        setCheckedAccess(true);
        setPendingUsers([]);
        setRoleByUserId({});
        return { ok: false, forbidden: true };
      }

      if (!response.ok || !payload?.success) {
        setCanManageUsers(true);
        setCheckedAccess(true);
        setAdminUsersError(
          getErrorMessage(
            response.status,
            payload,
            'Não foi possível carregar pendências de acesso.'
          )
        );
        return { ok: false };
      }

      const items = Array.isArray(payload?.data?.items) ? payload.data.items : [];
      setCanManageUsers(true);
      setCheckedAccess(true);
      setPendingUsers(items);
      setRoleByUserId(prev => {
        const next = { ...prev };
        items.forEach(item => {
          if (!next[item.id]) next[item.id] = 'triagem';
        });
        return next;
      });
      return { ok: true, total: items.length };
    } catch {
      setCanManageUsers(true);
      setCheckedAccess(true);
      setAdminUsersError('Falha de rede ao carregar pendências de acesso.');
      return { ok: false };
    } finally {
      setLoadingPendingUsers(false);
    }
  }, [enabled, jsonHeaders, pendingUrl]);

  const setRoleForUser = useCallback((userId, role) => {
    setRoleByUserId(prev => ({ ...prev, [userId]: role }));
  }, []);

  const approveUser = useCallback(
    async user => {
      if (!enabled || !approveUrl || !user?.email || !user?.id) return { ok: false, skipped: true };

      const selectedRole = roleByUserId[user.id] || 'triagem';
      setApprovingById(prev => ({ ...prev, [user.id]: true }));
      setAdminUsersError('');
      setAdminUsersNotice('');

      try {
        const response = await fetch(approveUrl, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ email: user.email, papel: selectedRole }),
        });

        let payload = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (response.status === 403) {
          setCanManageUsers(false);
          return { ok: false, forbidden: true };
        }

        if (!response.ok || !payload?.success) {
          setAdminUsersError(
            getErrorMessage(response.status, payload, 'Não foi possível aprovar o usuário.')
          );
          return { ok: false };
        }

        setPendingUsers(prev => prev.filter(item => item.id !== user.id));
        setRoleByUserId(prev => {
          const next = { ...prev };
          delete next[user.id];
          return next;
        });
        setAdminUsersNotice(`Usuário ${user.email} aprovado como ${selectedRole}.`);
        return { ok: true };
      } catch {
        setAdminUsersError('Falha de rede ao aprovar usuário.');
        return { ok: false };
      } finally {
        setApprovingById(prev => {
          const next = { ...prev };
          delete next[user.id];
          return next;
        });
      }
    },
    [enabled, approveUrl, jsonHeaders, roleByUserId]
  );

  useEffect(() => {
    setCheckedAccess(false);
    setCanManageUsers(false);
    setPendingUsers([]);
    setRoleByUserId({});
    setAdminUsersError('');
    setAdminUsersNotice('');

    if (!enabled) return;
    loadPendingUsers();
  }, [enabled, loadPendingUsers]);

  return {
    checkedAccess,
    canManageUsers,
    loadingPendingUsers,
    pendingUsers,
    roleByUserId,
    setRoleForUser,
    approvingById,
    adminUsersError,
    adminUsersNotice,
    approveUser,
    reloadPendingUsers: loadPendingUsers,
  };
}
