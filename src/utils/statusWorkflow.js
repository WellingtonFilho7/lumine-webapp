import { getMissingTriageFields, getMissingMatriculaFields } from './enrollment';
import {
  parseDocumentsReceived,
  parseParticipationDays,
  parseBoolean,
  normalizeImageConsent,
  getEnrollmentStatus,
} from './childData';
import {
  ENROLLMENT_STATUS_META,
  STATUS_FIELD_LABELS,
  TRIAGE_REQUIRED_STATUSES,
} from '../constants/enrollment';

export function getStatusMeta(child) {
  const status = getEnrollmentStatus(child);
  return {
    status,
    ...(ENROLLMENT_STATUS_META[status] || {
      label: 'Sem status',
      className: 'bg-teal-50 text-gray-600',
    }),
  };
}

export function buildStatusFormData(child) {
  return {
    name: child?.name || '',
    birthDate: child?.birthDate || '',
    guardianName: child?.guardianName || '',
    guardianPhone: child?.guardianPhone || '',
    neighborhood: child?.neighborhood || '',
    school: child?.school || '',
    schoolShift: child?.schoolShift || '',
    referralSource: child?.referralSource || '',
    schoolCommuteAlone: child?.schoolCommuteAlone || '',
    startDate: child?.startDate || child?.entryDate || '',
    participationDays: parseParticipationDays(child?.participationDays),
    authorizedPickup: child?.authorizedPickup || '',
    canLeaveAlone: child?.canLeaveAlone || '',
    leaveAloneConsent: parseBoolean(child?.leaveAloneConsent),
    leaveAloneConfirmation: child?.leaveAloneConfirmation || '',
    termsAccepted: Boolean(child?.responsibilityTerm || child?.consentTerm),
    classGroup: child?.classGroup || '',
    imageConsent: normalizeImageConsent(child?.imageConsent),
    documentsReceived: parseDocumentsReceived(child?.documentsReceived),
    initialObservations: child?.initialObservations || '',
  };
}

export function getMissingFieldsForStatus(status, data) {
  const requiresTriage = TRIAGE_REQUIRED_STATUSES.includes(status);
  const requiresMatricula = status === 'matriculado';
  const missingKeys = [
    ...(requiresTriage ? getMissingTriageFields(data) : []),
    ...(requiresMatricula ? getMissingMatriculaFields(data) : []),
  ];
  return [...new Set(missingKeys)].map(field => STATUS_FIELD_LABELS[field] || field);
}
