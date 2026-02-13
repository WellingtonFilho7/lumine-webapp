export const TRIAGE_REQUIRED_FIELDS = [
  'name',
  'sexo',
  'birthDate',
  'guardianName',
  'parentesco',
  'guardianPhone',
  'contatoEmergenciaNome',
  'contatoEmergenciaTelefone',
  'neighborhood',
  'school',
  'schoolShift',
  'referralSource',
  'schoolCommuteAlone',
  'renovacao',
  'termoLgpdAssinado',
];

export const MATRICULA_REQUIRED_FIELDS = [
  'startDate',
  'participationDays',
  'authorizedPickup',
  'canLeaveAlone',
  'formaChegada',
  'consentimentoSaude',
  'termsAccepted',
];

export function getMissingTriageFields(data) {
  return TRIAGE_REQUIRED_FIELDS.filter(field => !data?.[field]);
}

function hasLeaveAloneConfirmation(data) {
  if (data?.leaveAloneConfirmado) return true;
  if (data?.leaveAloneConsent && data?.leaveAloneConfirmation?.trim()) return true;
  return false;
}

export function getMissingMatriculaFields(data) {
  const missing = MATRICULA_REQUIRED_FIELDS.filter(field => {
    if (field === 'participationDays') return !(data?.participationDays?.length);
    return !data?.[field];
  });
  if (data?.canLeaveAlone === 'sim' && !hasLeaveAloneConfirmation(data)) {
    missing.push('leaveAloneConfirmado');
  }
  return missing;
}

export function isTriageComplete(data) {
  if (getMissingTriageFields(data).length) return false;
  if (data?.healthCareNeeded === 'sim' && !data?.healthNotes?.trim()) return false;
  return true;
}

export function isMatriculaComplete(data) {
  return getMissingMatriculaFields(data).length === 0;
}

export function isTriageDraft(child) {
  if (!child || child.enrollmentStatus !== 'em_triagem') return false;
  return !isTriageComplete(child);
}

export function buildChecklist(fields, data, labels = {}) {
  return fields.map(field => {
    let complete = false;
    if (field === 'participationDays') {
      complete = Boolean(data?.participationDays?.length);
    } else if (field === 'leaveAloneConfirmado') {
      complete = hasLeaveAloneConfirmation(data);
    } else {
      complete = Boolean(data?.[field]);
    }
    return {
      field,
      label: labels[field] || field,
      complete,
    };
  });
}
