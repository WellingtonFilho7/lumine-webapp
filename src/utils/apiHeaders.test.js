import { buildApiHeaders } from './apiHeaders';

describe('apiHeaders helper', () => {
  test('builds complete headers using only internal user jwt and metadata', () => {
    const headers = buildApiHeaders({
      userJwt: 'jwt-123',
      appVersion: 'v1.2.3',
      deviceId: 'device-1',
    });

    expect(headers.authHeaders).toEqual({ 'X-User-Jwt': 'jwt-123' });
    expect(headers.metaHeaders).toEqual({
      'X-Device-Id': 'device-1',
      'X-App-Version': 'v1.2.3',
    });
    expect(headers.baseHeaders).toEqual({
      'X-User-Jwt': 'jwt-123',
      'X-Device-Id': 'device-1',
      'X-App-Version': 'v1.2.3',
    });
    expect(headers.jsonHeaders).toEqual({
      'Content-Type': 'application/json',
      'X-User-Jwt': 'jwt-123',
      'X-Device-Id': 'device-1',
      'X-App-Version': 'v1.2.3',
    });
  });

  test('never emits Authorization header even if apiToken is provided', () => {
    const headers = buildApiHeaders({
      apiToken: 'legacy-token-123',
      userJwt: 'jwt-123',
    });

    expect(headers.authHeaders).toEqual({ 'X-User-Jwt': 'jwt-123' });
    expect(headers.baseHeaders.Authorization).toBeUndefined();
    expect(headers.jsonHeaders.Authorization).toBeUndefined();
  });

  test('omits optional headers when values are missing', () => {
    const headers = buildApiHeaders();

    expect(headers.authHeaders).toEqual({});
    expect(headers.metaHeaders).toEqual({});
    expect(headers.baseHeaders).toEqual({});
    expect(headers.jsonHeaders).toEqual({ 'Content-Type': 'application/json' });
  });
});
