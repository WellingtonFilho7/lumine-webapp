import {
  normalizeEnrollmentPayload,
  getEnrollmentHardeningMissingFields,
  FIXED_LGPD_CONSENT_TEXT,
  FIXED_LEAVE_ALONE_CONFIRMATION,
} from './enrollmentHardening';

test('normaliza valores acentuados para payload canonico ASCII', () => {
  const payload = normalizeEnrollmentPayload({
    schoolShift: 'manhã',
    referralSource: 'indicação',
    schoolCommuteAlone: 'não',
    canLeaveAlone: 'sim',
    leaveAloneConfirmado: true,
    termoLgpdAssinado: true,
    imageConsent: 'comunicação',
    classGroup: 'pré_alfabetização',
    formaChegada: 'levada_responsavel',
    documentsReceived: ['certidão_nascimento', 'comprovante_residência', 'foo'],
  });

  expect(payload.schoolShift).toBe('manha');
  expect(payload.referralSource).toBe('indicacao');
  expect(payload.schoolCommuteAlone).toBe('nao');
  expect(payload.imageConsent).toBe('comunicacao');
  expect(payload.classGroup).toBe('pre_alfabetizacao');
  expect(payload.documentsReceived).toEqual(['certidao_nascimento', 'comprovante_residencia']);
  expect(payload.consentimentoTexto).toBe(FIXED_LGPD_CONSENT_TEXT);
  expect(payload.leaveAloneConfirmation).toBe(FIXED_LEAVE_ALONE_CONFIRMATION);
});

test('exige leaveAloneConfirmado quando canLeaveAlone=sim', () => {
  const missing = getEnrollmentHardeningMissingFields(
    {
      canLeaveAlone: 'sim',
      leaveAloneConfirmado: false,
    },
    { strictMode: false }
  );

  expect(missing).toContain('leaveAloneConfirmado');
});

test('em modo estrito exige consentimentoSaude quando ha dados de saude', () => {
  const missing = getEnrollmentHardeningMissingFields(
    {
      canLeaveAlone: 'nao',
      healthNotes: 'asma leve',
      consentimentoSaude: false,
    },
    { strictMode: true }
  );

  expect(missing).toContain('consentimentoSaude');
});
