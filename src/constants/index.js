export const DEFAULT_API_URL = 'https://lumine-api.vercel.app/api/sync';

export const ONLINE_ONLY_MODE =
  (process.env.REACT_APP_ONLINE_ONLY || 'true').toLowerCase() !== 'false';
export const SHOW_LEGACY_SYNC_UI =
  (process.env.REACT_APP_SHOW_LEGACY_SYNC_UI || 'false').toLowerCase() === 'true';
export const MOBILE_UI_V2_ENABLED =
  (process.env.REACT_APP_MOBILE_UI_V2 || 'true').toLowerCase() !== 'false';

export const SYNC_SUCCESS_RESET_TIMEOUT_MS = 2000;
export const SYNC_WARNING_RESET_TIMEOUT_MS = 5000;

export const AUTO_SYNC_DELAY_MS = 3000;
export const AUTO_SYNC_RETRY_INTERVAL_MS = 45 * 1000;
export const RECORD_TOAST_DURATION_MS = 3000;

export const ATTENDANCE_THRESHOLDS = {
  GREEN: 80,
  YELLOW: 60,
};

export const ENROLLMENT_STATUS = {
  PRE_INSCRITO: 'pre_inscrito',
  EM_TRIAGEM: 'em_triagem',
  APROVADO: 'aprovado',
  LISTA_ESPERA: 'lista_espera',
  MATRICULADO: 'matriculado',
  RECUSADO: 'recusado',
  DESISTENTE: 'desistente',
  INATIVO: 'inativo',
};
