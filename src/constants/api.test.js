import {
  DEFAULT_API_BASE_URL,
  DEFAULT_API_URL,
  DEFAULT_BOOTSTRAP_URL,
} from './index';

describe('API defaults', () => {
  test('uses same-origin API by default', () => {
    expect(DEFAULT_API_BASE_URL).toBe('/api');
    expect(DEFAULT_API_URL).toBe('/api/sync');
    expect(DEFAULT_BOOTSTRAP_URL).toBe('/api/bootstrap');
  });
});
