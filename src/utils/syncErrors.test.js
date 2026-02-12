import { classifySyncError } from './syncErrors';

test('returns warning for offline scenario', () => {
  const result = classifySyncError({ isOnline: false });
  expect(result.level).toBe('warning');
  expect(result.autoDismissMs).toBeGreaterThan(0);
});

test('returns critical for unauthorized token', () => {
  const result = classifySyncError({ isOnline: true, status: 401 });
  expect(result.level).toBe('critical');
  expect(result.autoDismissMs).toBe(0);
  expect(result.message).toMatch(/token/i);
});

test('returns critical for revision mismatch', () => {
  const result = classifySyncError({
    isOnline: true,
    status: 409,
    payloadError: 'REVISION_MISMATCH',
  });
  expect(result.level).toBe('critical');
  expect(result.message).toMatch(/baixar/i);
});

test('returns warning with fallback message for unknown errors', () => {
  const result = classifySyncError({
    isOnline: true,
    status: 400,
    fallbackMessage: 'Erro HTTP 400',
  });
  expect(result.level).toBe('warning');
  expect(result.message).toBe('Erro HTTP 400');
});
