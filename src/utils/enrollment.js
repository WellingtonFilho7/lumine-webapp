export const TRIAGE_REQUIRED_FIELDS = [
  'name',
  'birthDate',
  'guardianName',
  'guardianPhone',
  'neighborhood',
  'school',
  'schoolShift',
  'referralSource',
  'schoolCommuteAlone',
];

export const MATRICULA_REQUIRED_FIELDS = [
  'startDate',
  'participationDays',
  'authorizedPickup',
  'canLeaveAlone',
  'termsAccepted',
];

export function getMissingTriageFields(data) {
  return TRIAGE_REQUIRED_FIELDS.filter(field => !data?.[field]);
}

export function getMissingMatriculaFields(data) {
  const missing = MATRICULA_REQUIRED_FIELDS.filter(field => {
    if (field === 'participationDays') return !(data?.participationDays?.length);
    return !data?.[field];
  });
  if (data?.canLeaveAlone === 'sim') {
    if (!data?.leaveAloneConsent) missing.push('leaveAloneConsent');
    if (!data?.leaveAloneConfirmation?.trim()) missing.push('leaveAloneConfirmation');
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
    } else if (field === 'leaveAloneConsent') {
      complete = Boolean(data?.leaveAloneConsent);
    } else if (field === 'leaveAloneConfirmation') {
      complete = Boolean(data?.leaveAloneConfirmation?.trim());
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
