import {
  getEnrollmentStatus,
  isMatriculated,
  parseEnrollmentHistory,
  parseDocumentsReceived,
  parseParticipationDays,
  parseBoolean,
  normalizeYesNo,
  normalizeImageConsent,
  normalizeChild,
  normalizeRecord,
} from './childData';

describe('childData helpers', () => {
  test('resolves enrollment status including legacy mapping', () => {
    expect(getEnrollmentStatus({ enrollmentStatus: 'aprovado' })).toBe('aprovado');
    expect(getEnrollmentStatus({ status: 'active' })).toBe('matriculado');
    expect(getEnrollmentStatus({ status: 'inactive' })).toBe('inativo');
    expect(getEnrollmentStatus(null)).toBe('matriculado');
    expect(isMatriculated({ enrollmentStatus: 'matriculado' })).toBe(true);
    expect(isMatriculated({ enrollmentStatus: 'recusado' })).toBe(false);
  });

  test('parses history/docs/participation safely', () => {
    expect(parseEnrollmentHistory('[{"action":"x"}]')).toEqual([{ action: 'x' }]);
    expect(parseEnrollmentHistory('not-json')).toEqual([]);
    expect(parseDocumentsReceived('a| b |')).toEqual(['a', 'b']);
    expect(parseParticipationDays('seg|qua')).toEqual(['seg', 'qua']);
  });

  test('normalizes boolean and yes/no variants', () => {
    expect(parseBoolean('sim')).toBe(true);
    expect(parseBoolean('não')).toBe(false);
    expect(parseBoolean(null)).toBe(false);

    expect(normalizeYesNo('YES')).toBe('sim');
    expect(normalizeYesNo('0')).toBe('nao');
    expect(normalizeYesNo(undefined)).toBe('');
  });

  test('normalizes image consent variants', () => {
    expect(normalizeImageConsent(true)).toBe('comunicacao');
    expect(normalizeImageConsent('internal')).toBe('interno');
    expect(normalizeImageConsent('comunicação')).toBe('comunicacao');
    expect(normalizeImageConsent('não')).toBe('');
  });

  test('normalizes child and record structures', () => {
    const childResult = normalizeChild({
      id: 'c1',
      status: 'active',
      documentsReceived: 'doc1|doc2',
      enrollmentHistory: '',
      responsibilityTerm: 'sim',
      schoolCommuteAlone: 'yes',
    });

    expect(childResult.child.enrollmentStatus).toBe('matriculado');
    expect(childResult.child.documentsReceived).toEqual(['doc1', 'doc2']);
    expect(Array.isArray(childResult.child.enrollmentHistory)).toBe(true);
    expect(childResult.child.responsibilityTerm).toBe(true);
    expect(childResult.child.schoolCommuteAlone).toBe('sim');

    const recordResult = normalizeRecord({ id: 'r1', childId: 'c1' });
    expect(recordResult.record.childInternalId).toBe('c1');
    expect(recordResult.record.childId).toBe('c1');
  });
});
