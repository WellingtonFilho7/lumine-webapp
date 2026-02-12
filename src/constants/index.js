export const DEFAULT_API_URL = 'https://lumine-api.vercel.app/api/sync';

export const SYNC_SUCCESS_RESET_TIMEOUT_MS = 2000;
export const SYNC_WARNING_RESET_TIMEOUT_MS = 5000;

export const AUTO_SYNC_DELAY_MS = 3000;
export const AUTO_SYNC_RETRY_INTERVAL_MS = 45 * 1000;

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
