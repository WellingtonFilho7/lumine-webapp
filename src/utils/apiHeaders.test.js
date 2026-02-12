import { buildApiHeaders } from './apiHeaders';

describe('apiHeaders helper', () => {
  test('builds complete headers when token and metadata are provided', () => {
    const headers = buildApiHeaders({
      apiToken: 'token-123',
      appVersion: 'v1.2.3',
      deviceId: 'device-1',
    });

    expect(headers.authHeaders).toEqual({ Authorization: 'Bearer token-123' });
    expect(headers.metaHeaders).toEqual({
      'X-Device-Id': 'device-1',
      'X-App-Version': 'v1.2.3',
    });
    expect(headers.baseHeaders).toEqual({
      Authorization: 'Bearer token-123',
      'X-Device-Id': 'device-1',
      'X-App-Version': 'v1.2.3',
    });
    expect(headers.jsonHeaders).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token-123',
      'X-Device-Id': 'device-1',
      'X-App-Version': 'v1.2.3',
    });
  });

  test('omits optional headers when values are missing', () => {
    const headers = buildApiHeaders();

    expect(headers.authHeaders).toEqual({});
    expect(headers.metaHeaders).toEqual({});
    expect(headers.baseHeaders).toEqual({});
    expect(headers.jsonHeaders).toEqual({ 'Content-Type': 'application/json' });
  });
});
