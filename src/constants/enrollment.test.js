import {
  ENROLLMENT_STATUS_META,
  TRIAGE_RESULT_OPTIONS,
  OPERATIONAL_STATUS_OPTIONS,
  ACTIVE_STATUS_OPTIONS,
  ARCHIVED_STATUS_OPTIONS,
  getOperationalStatusSelectOptions,
  PARTICIPATION_DAYS,
  STATUS_FIELD_LABELS,
  TRIAGE_REQUIRED_STATUSES,
  WEEKDAY_KEYS,
  MOOD_LABELS,
} from './enrollment';

describe('enrollment constants', () => {
  test('status metadata contains key statuses', () => {
    expect(ENROLLMENT_STATUS_META.matriculado.label).toBe('Matriculado');
    expect(ENROLLMENT_STATUS_META.em_triagem.label).toBe('Em triagem');
    expect(ENROLLMENT_STATUS_META.inativo.label).toBe('Inativo');
  });

  test('triage options and participation days remain stable', () => {
    expect(TRIAGE_RESULT_OPTIONS.map(o => o.value)).toEqual([
      'aprovado',
      'lista_espera',
      'recusado',
    ]);

    expect(PARTICIPATION_DAYS.map(d => d.value)).toEqual(['seg', 'ter', 'qua', 'qui', 'sex']);
  });

  test('operational ui status options stay simplified but preserve legacy current status', () => {
    expect(ACTIVE_STATUS_OPTIONS.map(option => option.value)).toEqual(['em_triagem', 'matriculado']);
    expect(ARCHIVED_STATUS_OPTIONS.map(option => option.value)).toEqual(['desistente', 'inativo']);
    expect(OPERATIONAL_STATUS_OPTIONS.map(option => option.value)).toEqual([
      'em_triagem',
      'matriculado',
      'desistente',
      'inativo',
    ]);

    expect(getOperationalStatusSelectOptions('matriculado').map(option => option.value)).toEqual([
      'em_triagem',
      'matriculado',
      'desistente',
      'inativo',
    ]);

    expect(getOperationalStatusSelectOptions('aprovado').map(option => option.value)).toEqual([
      'aprovado',
      'em_triagem',
      'matriculado',
      'desistente',
      'inativo',
    ]);
  });

  test('required status/data maps include expected fields', () => {
    expect(TRIAGE_REQUIRED_STATUSES).toEqual(
      expect.arrayContaining(['em_triagem', 'aprovado', 'matriculado'])
    );

    expect(WEEKDAY_KEYS).toEqual(['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']);
    expect(STATUS_FIELD_LABELS.guardianPhone).toBe('Telefone (WhatsApp)');
    expect(MOOD_LABELS.calm).toContain('Tranquila');
  });
});
