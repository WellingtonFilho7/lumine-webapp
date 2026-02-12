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
      documentsReceived: 'certidao|comprovante',
      responsibilityTerm: true,
    });

    expect(result.name).toBe('Crianca A');
    expect(result.participationDays).toEqual(['seg', 'qua']);
    expect(result.leaveAloneConsent).toBe(true);
    expect(result.imageConsent).toBe('comunicacao');
    expect(result.documentsReceived).toEqual(['certidao', 'comprovante']);
    expect(result.termsAccepted).toBe(true);
  });

  test('maps missing field keys to human-readable labels', () => {
    const missing = getMissingFieldsForStatus('matriculado', {
      canLeaveAlone: 'sim',
      participationDays: [],
    });

    expect(missing).toEqual(expect.arrayContaining([
      'Nome completo',
      'Data de nascimento',
      'Autorização de saída desacompanhada',
      'Confirmação da autorização',
    ]));
  });
});
