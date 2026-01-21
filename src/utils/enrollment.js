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
  return getMissingTriageFields(data).length === 0;
}

export function isMatriculaComplete(data) {
  return getMissingMatriculaFields(data).length === 0;
}

export function isTriageDraft(child) {
  if (!child || child.enrollmentStatus !== 'em_triagem') return false;
  return !isTriageComplete(child);
}
