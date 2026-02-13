export const FIXED_LGPD_CONSENT_TEXT =
  'Responsavel confirmou assinatura do Termo LGPD fisico para triagem e matricula.';

export const FIXED_LEAVE_ALONE_CONFIRMATION =
  'Responsavel confirma autorizacao de saida desacompanhada conforme termo padrao do Lumine.';

export const DOCUMENT_KEYS = [
  'certidao_nascimento',
  'documento_responsavel',
  'comprovante_residencia',
  'carteira_vacinacao',
];

function normalizeAsciiToken(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeYesNo(value) {
  const token = normalizeAsciiToken(value);
  if (!token) return '';
  if (['sim', 'yes', 'true', '1'].includes(token)) return 'sim';
  if (['nao', 'no', 'false', '0'].includes(token)) return 'nao';
  return token;
}

function normalizeSchoolShift(value) {
  const token = normalizeAsciiToken(value);
  if (!token) return '';
  if (token === 'manha') return 'manha';
  if (token === 'tarde') return 'tarde';
  if (token === 'integral') return 'integral';
  return token;
}

function normalizeReferralSource(value) {
  const token = normalizeAsciiToken(value);
  if (!token) return '';
  if (token === 'cras') return 'CRAS';
  if (token === 'indicacao') return 'indicacao';
  if (token === 'redes_sociais') return 'redes_sociais';
  return token;
}

function normalizePriority(value) {
  const token = normalizeAsciiToken(value);
  if (!token) return '';
  if (['alta', 'media', 'baixa'].includes(token)) return token;
  return token;
}

function normalizeImageConsent(value) {
  const token = normalizeAsciiToken(value);
  if (!token || token === 'nenhuma') return '';
  if (token === 'interno') return 'interno';
  if (token === 'comunicacao') return 'comunicacao';
  return token;
}

function normalizeClassGroup(value) {
  const token = normalizeAsciiToken(value);
  if (!token) return '';
  const map = {
    pre_alfabetizacao: 'pre_alfabetizacao',
    alfabetizacao: 'alfabetizacao',
    fundamental_1: 'fundamental_1',
    fundamental_2: 'fundamental_2',
  };
  return map[token] || token;
}

function normalizeFormaChegada(value) {
  const token = normalizeAsciiToken(value);
  if (!token) return '';
  const map = {
    a_pe: 'a_pe',
    transporte_escolar: 'transporte_escolar',
    levada_responsavel: 'levada_responsavel',
    outro: 'outro',
  };
  return map[token] || token;
}

function normalizeDocumentKey(value) {
  const token = normalizeAsciiToken(value).replace(/\s+/g, '_');
  const map = {
    certidao_nascimento: 'certidao_nascimento',
    documento_responsavel: 'documento_responsavel',
    comprovante_residencia: 'comprovante_residencia',
    carteira_vacinacao: 'carteira_vacinacao',
  };
  return map[token] || token;
}

function normalizeDocumentsReceived(values) {
  if (!Array.isArray(values)) return [];
  const normalized = [];
  for (const value of values) {
    const key = normalizeDocumentKey(value);
    if (DOCUMENT_KEYS.includes(key) && !normalized.includes(key)) {
      normalized.push(key);
    }
  }
  return normalized;
}

function normalizeBoolean(value) {
  if (value === true || value === false) return value;
  const token = normalizeAsciiToken(value);
  if (!token) return false;
  return ['true', '1', 'sim', 'yes'].includes(token);
}

function normalizeRenovacao(value) {
  if (value === true || value === false) return value;
  const token = normalizeAsciiToken(value);
  if (!token) return false;
  return ['true', '1', 'sim', 'yes'].includes(token);
}

export function normalizeEnrollmentPayload(form) {
  const normalized = {
    ...form,
    schoolShift: normalizeSchoolShift(form.schoolShift),
    referralSource: normalizeReferralSource(form.referralSource),
    schoolCommuteAlone: normalizeYesNo(form.schoolCommuteAlone),
    healthCareNeeded: normalizeYesNo(form.healthCareNeeded),
    canLeaveAlone: normalizeYesNo(form.canLeaveAlone),
    priority: normalizePriority(form.priority),
    imageConsent: normalizeImageConsent(form.imageConsent),
    classGroup: normalizeClassGroup(form.classGroup),
    formaChegada: normalizeFormaChegada(form.formaChegada),
    documentsReceived: normalizeDocumentsReceived(form.documentsReceived),
    termsAccepted: normalizeBoolean(form.termsAccepted),
    termoLgpdAssinado: normalizeBoolean(form.termoLgpdAssinado),
    consentimentoSaude: normalizeBoolean(form.consentimentoSaude),
    leaveAloneConfirmado: normalizeBoolean(form.leaveAloneConfirmado),
    renovacao: normalizeRenovacao(form.renovacao),
  };

  normalized.consentimentoLgpd = normalized.termoLgpdAssinado;
  normalized.consentimentoTexto = normalized.termoLgpdAssinado ? FIXED_LGPD_CONSENT_TEXT : '';

  normalized.leaveAloneConsent = normalized.leaveAloneConfirmado;
  normalized.leaveAloneConfirmation =
    normalized.canLeaveAlone === 'sim' && normalized.leaveAloneConfirmado
      ? FIXED_LEAVE_ALONE_CONFIRMATION
      : '';

  if (normalized.restricaoAlimentar || normalized.alergiaAlimentar) {
    normalized.dietaryRestriction = 'sim';
  } else if (normalized.dietaryRestriction !== 'sim') {
    normalized.dietaryRestriction = 'nao';
  }

  return normalized;
}

export function getEnrollmentHardeningMissingFields(form, options = {}) {
  const strictMode = options.strictMode === true;
  const missing = [];

  if (normalizeYesNo(form.canLeaveAlone) === 'sim' && !normalizeBoolean(form.leaveAloneConfirmado)) {
    missing.push('leaveAloneConfirmado');
  }

  const hasHealthData = Boolean(
    form.healthNotes ||
      form.specialNeeds ||
      form.restricaoAlimentar ||
      form.alergiaAlimentar ||
      form.alergiaMedicamento ||
      form.medicamentosEmUso
  );

  if (strictMode && hasHealthData && !normalizeBoolean(form.consentimentoSaude)) {
    missing.push('consentimentoSaude');
  }

  return missing;
}
