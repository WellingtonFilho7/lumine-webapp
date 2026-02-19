import {
  getStatusMeta,
  buildStatusFormData,
  getMissingFieldsForStatus,
} from './statusWorkflow';

describe('statusWorkflow helpers', () => {
  test('returns status metadata and fallback for unknown status', () => {
    expect(getStatusMeta({ enrollmentStatus: 'matriculado' })).toMatchObject({
      status: 'matriculado',
      label: 'Matriculado',
    });

    expect(getStatusMeta({ enrollmentStatus: 'desconhecido' })).toMatchObject({
      status: 'desconhecido',
      label: 'Sem status',
    });
  });

  test('builds normalized status form data', () => {
    const result = buildStatusFormData({
      name: 'Crianca A',
      participationDays: 'seg|qua',
      leaveAloneConsent: 'sim',
      imageConsent: 'communication',
      documentsReceived: 'certidao_nascimento|comprovante_residencia',
      responsibilityTerm: true,
      consentimentoSaude: true,
      termoLgpdAssinado: true,
    });

    expect(result.name).toBe('Crianca A');
    expect(result.participationDays).toEqual(['seg', 'qua']);
    expect(result.leaveAloneConsent).toBe(true);
    expect(result.leaveAloneConfirmado).toBe(true);
    expect(result.imageConsent).toBe('comunicacao');
    expect(result.documentsReceived).toEqual(['certidao_nascimento', 'comprovante_residencia']);
    expect(result.termsAccepted).toBe(true);
    expect(result.consentimentoSaude).toBe(true);
    expect(result.termoLgpdAssinado).toBe(true);
  });

  test('maps missing field keys to human-readable labels', () => {
    const missing = getMissingFieldsForStatus('matriculado', {
      canLeaveAlone: 'sim',
      participationDays: [],
    });

    expect(missing).toEqual(
      expect.arrayContaining([
        'Nome completo',
        'Data de nascimento',
        'Forma de chegada/saída',
        'Autorização para dados de saúde',
        'Confirmação de saída desacompanhada',
      ])
    );
  });
});

test('normalizes legacy triage values for status form editing', () => {
  const result = buildStatusFormData({
    schoolShift: 'Manhã',
    referralSource: 'indicação',
    renovacao: false,
  });

  expect(result.schoolShift).toBe('manha');
  expect(result.referralSource).toBe('indicacao');
  expect(result.renovacao).toBe('nao');
});
