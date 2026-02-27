const LEGACY_STATUS_MAP = {
  active: 'matriculado',
  inactive: 'inativo',
};
const ARCHIVED_STATUSES = new Set(['inativo', 'desistente']);

function normalizeAsciiToken(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
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

export function getEnrollmentStatus(child) {
  if (!child) return 'matriculado';
  if (child.enrollmentStatus) return child.enrollmentStatus;
  const legacy = child.status ? LEGACY_STATUS_MAP[child.status] : '';
  return legacy || 'matriculado';
}

export function isMatriculated(child) {
  return getEnrollmentStatus(child) === 'matriculado';
}

export function isArchivedStatus(status) {
  return ARCHIVED_STATUSES.has(normalizeAsciiToken(status));
}

export function isArchivedChild(child) {
  return isArchivedStatus(getEnrollmentStatus(child));
}

export function filterChildrenForMainList(childrenList, options = {}) {
  const { includeArchived = false } = options;
  if (!Array.isArray(childrenList)) return [];
  if (includeArchived) return childrenList;
  return childrenList.filter(child => !isArchivedChild(child));
}

export function parseEnrollmentHistory(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseDocumentsReceived(value) {
  if (!value) return [];
  const list = Array.isArray(value)
    ? value
    : String(value)
        .split('|')
        .map(item => item.trim())
        .filter(Boolean);

  const normalized = [];
  for (const item of list) {
    const key = normalizeDocumentKey(item);
    if (!normalized.includes(key)) normalized.push(key);
  }
  return normalized;
}

export function parseParticipationDays(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split('|')
    .map(item => item.trim())
    .filter(Boolean);
}

export function parseBoolean(value) {
  if (value === true || value === false) return value;
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  if (['true', 'sim', 'yes', '1'].includes(normalized)) return true;
  if (['false', 'nao', 'não', 'no', '0'].includes(normalized)) return false;
  return false;
}

export function normalizeYesNo(value) {
  if (value == null) return '';
  const normalized = String(value).trim().toLowerCase();
  if (['sim', 'yes', 'true', '1'].includes(normalized)) return 'sim';
  if (['nao', 'não', 'no', 'false', '0'].includes(normalized)) return 'nao';
  return normalized;
}

export function normalizeImageConsent(value) {
  if (value === true) return 'comunicacao';
  if (value === false || value == null) return '';
  const normalized = String(value).trim().toLowerCase();
  if (['interno', 'internal', 'uso_interno'].includes(normalized)) return 'interno';
  if (['comunicacao', 'communication', 'comunicação'].includes(normalized)) return 'comunicacao';
  if (['nao', 'não', 'no', 'nenhum'].includes(normalized)) return '';
  return normalized;
}

export function normalizeChild(child) {
  const normalized = { ...child };
  let changed = false;

  const status = getEnrollmentStatus(normalized);
  if (normalized.enrollmentStatus !== status) {
    normalized.enrollmentStatus = status;
    changed = true;
  }

  if (normalized.childId == null) {
    normalized.childId = '';
    changed = true;
  }

  const docs = parseDocumentsReceived(normalized.documentsReceived);
  if (docs !== normalized.documentsReceived) {
    normalized.documentsReceived = docs;
    changed = true;
  }

  const history = parseEnrollmentHistory(normalized.enrollmentHistory);
  if (history !== normalized.enrollmentHistory) {
    normalized.enrollmentHistory = history;
    changed = true;
  }

  if (!normalized.enrollmentHistory.length) {
    const baseDate = normalized.createdAt || new Date().toISOString();
    const notes = normalized.status ? 'Migração do sistema anterior' : 'Cadastro inicial';
    normalized.enrollmentHistory = [{ date: baseDate, action: status, notes }];
    changed = true;
  }

  if (!normalized.enrollmentDate) {
    normalized.enrollmentDate =
      normalized.entryDate || normalized.createdAt || new Date().toISOString();
    changed = true;
  }

  if (status === 'matriculado' && !normalized.matriculationDate) {
    normalized.matriculationDate = normalized.entryDate || normalized.enrollmentDate;
    changed = true;
  }

  if (!normalized.startDate && normalized.entryDate) {
    normalized.startDate = normalized.entryDate;
    changed = true;
  }

  const participationDays = parseParticipationDays(normalized.participationDays);
  if (participationDays !== normalized.participationDays) {
    normalized.participationDays = participationDays;
    changed = true;
  }

  const normalizedImageConsent = normalizeImageConsent(normalized.imageConsent);
  if (normalizedImageConsent !== normalized.imageConsent) {
    normalized.imageConsent = normalizedImageConsent;
    changed = true;
  }

  const normalizedClassGroup = normalizeClassGroup(normalized.classGroup);
  if (normalizedClassGroup !== normalized.classGroup) {
    normalized.classGroup = normalizedClassGroup;
    changed = true;
  }

  [
    'responsibilityTerm',
    'consentTerm',
    'leaveAloneConsent',
    'leaveAloneConfirmado',
    'termoLgpdAssinado',
    'consentimentoSaude',
  ].forEach(field => {
    const parsed = parseBoolean(normalized[field]);
    if (parsed !== normalized[field]) {
      normalized[field] = parsed;
      changed = true;
    }
  });

  ['schoolCommuteAlone', 'healthCareNeeded', 'dietaryRestriction', 'canLeaveAlone'].forEach(
    field => {
      const normalizedValue = normalizeYesNo(normalized[field]);
      if (normalizedValue !== normalized[field]) {
        normalized[field] = normalizedValue;
        changed = true;
      }
    }
  );

  if (normalized.leaveAloneConfirmation == null) {
    normalized.leaveAloneConfirmation = '';
    changed = true;
  }

  if (normalized.formaChegada == null) {
    normalized.formaChegada = '';
    changed = true;
  }

  return { child: normalized, changed };
}

export function normalizeChildren(childrenList) {
  if (!Array.isArray(childrenList)) {
    return { children: [], changed: true };
  }
  let changed = false;
  const normalized = childrenList.map(child => {
    const result = normalizeChild(child);
    if (result.changed) changed = true;
    return result.child;
  });
  return { children: normalized, changed };
}

export function normalizeRecord(record) {
  const normalized = { ...record };
  let changed = false;
  const internalId = normalized.childInternalId || normalized.childId || '';

  if (normalized.childInternalId !== internalId) {
    normalized.childInternalId = internalId;
    changed = true;
  }

  if (normalized.childId !== internalId) {
    normalized.childId = internalId;
    changed = true;
  }

  return { record: normalized, changed };
}

export function normalizeRecords(recordsList) {
  if (!Array.isArray(recordsList)) {
    return { records: [], changed: true };
  }
  let changed = false;
  const normalized = recordsList.map(record => {
    const result = normalizeRecord(record);
    if (result.changed) changed = true;
    return result.record;
  });
  return { records: normalized, changed };
}
