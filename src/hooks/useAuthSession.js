import { useEffect, useState } from 'react';
import { getSupabaseClient, isSupabaseAuthConfigured } from '../auth/supabaseClient';

export default function useAuthSession({ requireLogin }) {
  const [authReady, setAuthReady] = useState(!requireLogin);
  const [session, setSession] = useState(null);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!requireLogin) {
      setAuthReady(true);
      setSession(null);
      setAuthError('');
      return undefined;
    }

    if (!isSupabaseAuthConfigured()) {
      setAuthReady(true);
      setAuthError('Supabase Auth não configurado no frontend.');
      setSession(null);
      return undefined;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthReady(true);
      setAuthError('Não foi possível iniciar o cliente de autenticação.');
      setSession(null);
      return undefined;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setAuthError(error.message || 'Falha ao recuperar sessão.');
          setSession(null);
        } else {
          setAuthError('');
          setSession(data.session || null);
        }
        setAuthReady(true);
      })
      .catch(error => {
        if (!mounted) return;
        setAuthError(error?.message || 'Falha ao recuperar sessão.');
        setSession(null);
        setAuthReady(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      if (nextSession) {
        setSession(nextSession);
        setAuthError('');
        setAuthReady(true);
        return;
      }

      // Evita "queda fantasma" de sessão em eventos transitórios.
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setSession(null);
        setAuthReady(true);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [requireLogin]);

  return {
    authReady,
    authError,
    session,
    supabase: getSupabaseClient(),
  };
}
