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
  };
  expect(getMissingTriageFields(data)).toEqual(['name', 'guardianPhone']);
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
  };
  expect(isTriageComplete(data)).toBe(true);
});

test('matricula missing fields accounts for participation days and leave alone', () => {
  const data = {
    startDate: '2026-01-10',
    participationDays: [],
    authorizedPickup: '',
    canLeaveAlone: 'sim',
    leaveAloneConfirmado: false,
    referralSource: '',
    schoolCommuteAlone: '',
    renovacao: '',
    healthCareNeeded: '',
    formaChegada: '',
    consentimentoSaude: false,
    termsAccepted: false,
  };
  expect(getMissingMatriculaFields(data).sort()).toEqual(
    [
      'participationDays',
      'authorizedPickup',
      'leaveAloneConfirmado',
      'referralSource',
      'schoolCommuteAlone',
      'renovacao',
      'healthCareNeeded',
      'formaChegada',
      'consentimentoSaude',
      'termsAccepted',
    ].sort()
  );
});

test('triage draft when status em_triagem and incomplete', () => {
  const child = {
    enrollmentStatus: 'em_triagem',
    name: 'Joao',
    birthDate: '2026-01-01',
    guardianName: 'Ana',
    guardianPhone: '',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manha',
  };
  expect(isTriageDraft(child)).toBe(true);
});

test('buildChecklist marks fields as complete or missing', () => {
  const labels = {
    name: 'Nome',
    guardianPhone: 'Telefone',
    leaveAloneConfirmado: 'Confirmação saída',
  };
  const data = {
    name: 'Joao',
    guardianPhone: '',
    canLeaveAlone: 'sim',
    leaveAloneConfirmado: false,
  };
  expect(buildChecklist(['name', 'guardianPhone', 'leaveAloneConfirmado'], data, labels)).toEqual([
    { field: 'name', label: 'Nome', complete: true },
    { field: 'guardianPhone', label: 'Telefone', complete: false },
    { field: 'leaveAloneConfirmado', label: 'Confirmação saída', complete: false },
  ]);
});

test('matricula complete with legal fields and conditional leave alone confirmation', () => {
  const data = {
    name: 'Joao',
    birthDate: '2026-01-01',
    guardianName: 'Ana',
    guardianPhone: '9999',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manha',
    startDate: '2026-01-10',
    participationDays: ['seg'],
    authorizedPickup: 'Mae',
    canLeaveAlone: 'sim',
    leaveAloneConfirmado: true,
    referralSource: 'igreja',
    schoolCommuteAlone: 'nao',
    renovacao: 'nao',
    healthCareNeeded: 'nao',
    formaChegada: 'a_pe',
    consentimentoSaude: true,
    termsAccepted: true,
  };
  expect(isMatriculaComplete(data)).toBe(true);
});

test('matricula accepts renovacao boolean false as filled value', () => {
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
    renovacao: false,
    startDate: '2026-01-10',
    participationDays: ['seg'],
    authorizedPickup: 'Mae',
    canLeaveAlone: 'nao',
    healthCareNeeded: 'nao',
    formaChegada: 'a_pe',
    consentimentoSaude: true,
    termsAccepted: true,
  };

  expect(getMissingMatriculaFields(data)).toEqual([]);
});

test('matricula requires healthNotes when healthCareNeeded is sim', () => {
  const data = {
    name: 'Joao',
    birthDate: '2026-01-01',
    guardianName: 'Ana',
    guardianPhone: '9999',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manha',
    startDate: '2026-01-10',
    participationDays: ['seg'],
    authorizedPickup: 'Mae',
    canLeaveAlone: 'nao',
    referralSource: 'igreja',
    schoolCommuteAlone: 'nao',
    renovacao: 'nao',
    healthCareNeeded: 'sim',
    healthNotes: '',
    formaChegada: 'a_pe',
    consentimentoSaude: true,
    termsAccepted: true,
  };
  expect(getMissingMatriculaFields(data)).toContain('healthNotes');
});
