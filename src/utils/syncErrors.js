import { SYNC_WARNING_RESET_TIMEOUT_MS } from '../constants';

function asString(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return String(value);
}

export function classifySyncError({ isOnline, status, payloadError, details, fallbackMessage }) {
  if (!isOnline) {
    return {
      message: 'Sem internet. Verifique a conexao e tente novamente.',
      level: 'warning',
      autoDismissMs: SYNC_WARNING_RESET_TIMEOUT_MS,
    };
  }

  if (status === 401) {
    return {
      message: 'Token invalido ou expirado. Verifique as variaveis da Vercel.',
      level: 'critical',
      autoDismissMs: 0,
    };
  }

  if (status === 403) {
    return {
      message: 'Origem nao permitida. Confirme ORIGINS_ALLOWLIST na API.',
      level: 'critical',
      autoDismissMs: 0,
    };
  }

  if (status === 409 && payloadError === 'REVISION_MISMATCH') {
    return {
      message: 'Dados alterados por outro dispositivo. Toque em Baixar antes de sincronizar.',
      level: 'critical',
      autoDismissMs: 0,
    };
  }

  if (status === 409 && payloadError === 'DATA_LOSS_PREVENTED') {
    return {
      message: 'Servidor tem mais dados. Baixe antes de sincronizar.',
      level: 'critical',
      autoDismissMs: 0,
    };
  }

  if (typeof status === 'number' && status >= 500) {
    return {
      message: 'Servidor indisponivel no momento. Tente novamente em instantes.',
      level: 'critical',
      autoDismissMs: 0,
    };
  }

  const msg = asString(payloadError) || asString(details) || asString(fallbackMessage) || 'Erro na sincronizacao';

  if (/failed to fetch|network|fetch/i.test(msg)) {
    return {
      message: 'Nao foi possivel conectar ao servidor. Verifique sua conexao.',
      level: 'critical',
      autoDismissMs: 0,
    };
  }

  return {
    message: msg,
    level: 'warning',
    autoDismissMs: SYNC_WARNING_RESET_TIMEOUT_MS,
  };
}
