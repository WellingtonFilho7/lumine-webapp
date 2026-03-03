import { formatPhoneBR } from './phone';

describe('formatPhoneBR', () => {
  test('formats 11 digits as (DD) 99999-9999', () => {
    expect(formatPhoneBR('83999991111')).toBe('(83) 99999-1111');
  });

  test('keeps progressive formatting while typing', () => {
    expect(formatPhoneBR('8')).toBe('(8');
    expect(formatPhoneBR('8399')).toBe('(83) 99');
    expect(formatPhoneBR('8399999')).toBe('(83) 9999-9');
  });

  test('ignores non-digit chars and trims extra digits', () => {
    expect(formatPhoneBR('(83) 99999-11112222')).toBe('(83) 99999-1111');
  });
});
