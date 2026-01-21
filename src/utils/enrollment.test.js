import {
  getMissingTriageFields,
  getMissingMatriculaFields,
  isTriageComplete,
  isMatriculaComplete,
  isTriageDraft,
  buildChecklist,
} from './enrollment';

test('triage missing fields returns required keys', () => {
  const data = {
    name: '',
    birthDate: '2026-01-01',
    guardianName: 'Ana',
    guardianPhone: '',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manha',
    referralSource: 'igreja',
    schoolCommuteAlone: '',
  };
  expect(getMissingTriageFields(data)).toEqual(['name', 'guardianPhone', 'schoolCommuteAlone']);
});

test('triage complete when no missing fields', () => {
  const data = {
    name: 'Joao',
    birthDate: '2026-01-01',
    guardianName: 'Ana',
    guardianPhone: '9999',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manha',
    referralSource: 'igreja',
    schoolCommuteAlone: 'nao',
  };
  expect(isTriageComplete(data)).toBe(true);
});

test('matricula missing fields accounts for participation days and leave alone', () => {
  const data = {
    startDate: '2026-01-10',
    participationDays: [],
    authorizedPickup: '',
    canLeaveAlone: 'sim',
    leaveAloneConsent: false,
    leaveAloneConfirmation: '',
    termsAccepted: false,
  };
  expect(getMissingMatriculaFields(data).sort()).toEqual([
    'participationDays',
    'authorizedPickup',
    'leaveAloneConsent',
    'leaveAloneConfirmation',
    'termsAccepted',
  ].sort());
});

test('triage draft when status em_triagem and incomplete', () => {
  const child = {
    enrollmentStatus: 'em_triagem',
    name: 'Joao',
    guardianName: 'Ana',
    guardianPhone: '',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manha',
    referralSource: 'igreja',
    schoolCommuteAlone: 'nao',
  };
  expect(isTriageDraft(child)).toBe(true);
});

test('buildChecklist marks fields as complete or missing', () => {
  const labels = {
    name: 'Nome',
    guardianPhone: 'Telefone',
  };
  const data = {
    name: 'Joao',
    guardianPhone: '',
  };
  expect(buildChecklist(['name', 'guardianPhone'], data, labels)).toEqual([
    { field: 'name', label: 'Nome', complete: true },
    { field: 'guardianPhone', label: 'Telefone', complete: false },
  ]);
});

test('triage incomplete when health care needed and notes missing', () => {
  const data = {
    name: 'Joao',
    birthDate: '2026-01-01',
    guardianName: 'Ana',
    guardianPhone: '9999',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manha',
    referralSource: 'igreja',
    schoolCommuteAlone: 'nao',
    healthCareNeeded: 'sim',
    healthNotes: '',
  };
  expect(isTriageComplete(data)).toBe(false);
});

test('triage complete makes draft false for em_triagem', () => {
  const child = {
    enrollmentStatus: 'em_triagem',
    name: 'Joao',
    birthDate: '2026-01-01',
    guardianName: 'Ana',
    guardianPhone: '999',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manha',
    referralSource: 'igreja',
    schoolCommuteAlone: 'nao',
  };
  expect(isTriageDraft(child)).toBe(false);
});

