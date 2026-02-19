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
    sexo: 'M',
    birthDate: '2026-01-01',
    guardianName: 'Ana',
    parentesco: '',
    guardianPhone: '',
    contatoEmergenciaNome: 'Carlos',
    contatoEmergenciaTelefone: '',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manha',
    referralSource: 'igreja',
    schoolCommuteAlone: '',
    renovacao: 'nao',
    termoLgpdAssinado: true,
  };
  expect(getMissingTriageFields(data)).toEqual([
    'name',
    'parentesco',
    'guardianPhone',
    'contatoEmergenciaTelefone',
    'schoolCommuteAlone',
  ]);
});

test('triage complete when no missing fields', () => {
  const data = {
    name: 'Joao',
    sexo: 'M',
    birthDate: '2026-01-01',
    guardianName: 'Ana',
    parentesco: 'mae',
    guardianPhone: '9999',
    contatoEmergenciaNome: 'Carlos',
    contatoEmergenciaTelefone: '8888',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manha',
    referralSource: 'igreja',
    schoolCommuteAlone: 'nao',
    renovacao: 'nao',
    termoLgpdAssinado: true,
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
    formaChegada: '',
    consentimentoSaude: false,
    termsAccepted: false,
  };
  expect(getMissingMatriculaFields(data).sort()).toEqual(
    [
      'participationDays',
      'authorizedPickup',
      'leaveAloneConfirmado',
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
    sexo: 'M',
    birthDate: '2026-01-01',
    guardianName: 'Ana',
    parentesco: 'mae',
    guardianPhone: '',
    contatoEmergenciaNome: 'Carlos',
    contatoEmergenciaTelefone: '8888',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manha',
    referralSource: 'igreja',
    schoolCommuteAlone: 'nao',
    renovacao: 'nao',
    termoLgpdAssinado: true,
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

test('triage incomplete when health care needed and notes missing', () => {
  const data = {
    name: 'Joao',
    sexo: 'M',
    birthDate: '2026-01-01',
    guardianName: 'Ana',
    parentesco: 'mae',
    guardianPhone: '9999',
    contatoEmergenciaNome: 'Carlos',
    contatoEmergenciaTelefone: '8888',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manha',
    referralSource: 'igreja',
    schoolCommuteAlone: 'nao',
    renovacao: 'nao',
    termoLgpdAssinado: true,
    healthCareNeeded: 'sim',
    healthNotes: '',
  };
  expect(isTriageComplete(data)).toBe(false);
});

test('matricula complete with legal fields and conditional leave alone confirmation', () => {
  const data = {
    startDate: '2026-01-10',
    participationDays: ['seg'],
    authorizedPickup: 'Mae',
    canLeaveAlone: 'sim',
    leaveAloneConfirmado: true,
    formaChegada: 'a_pe',
    consentimentoSaude: true,
    termsAccepted: true,
  };
  expect(isMatriculaComplete(data)).toBe(true);
});

test('triage accepts renovacao boolean false as filled value', () => {
  const data = {
    name: 'Joao',
    sexo: 'M',
    birthDate: '2026-01-01',
    guardianName: 'Ana',
    parentesco: 'mae',
    guardianPhone: '9999',
    contatoEmergenciaNome: 'Carlos',
    contatoEmergenciaTelefone: '8888',
    neighborhood: 'Centro',
    school: 'Escola A',
    schoolShift: 'manha',
    referralSource: 'igreja',
    schoolCommuteAlone: 'nao',
    renovacao: false,
    termoLgpdAssinado: true,
  };

  expect(getMissingTriageFields(data)).toEqual([]);
});
