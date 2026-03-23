import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import useOperationalBackup from './useOperationalBackup';

function buildJsonResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return headers[name] || headers[name.toLowerCase()] || null;
      },
    },
    json: async () => body,
    blob: async () => new Blob(['{}'], { type: 'application/json' }),
  };
}

describe('useOperationalBackup', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    global.URL.createObjectURL = vi.fn(() => 'blob:backup');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('baixa o backup operacional com nome vindo do content-disposition', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    global.fetch.mockResolvedValueOnce(
      buildJsonResponse(200, {}, {
        'Content-Disposition': 'attachment; filename="operational-backup-20260323_220000.json"',
      })
    );

    const { result } = renderHook(() =>
      useOperationalBackup({
        apiBaseUrl: 'https://lumine-api.vercel.app/api',
        jsonHeaders: { 'X-User-Jwt': 'jwt' },
        enabled: true,
      })
    );

    await act(async () => {
      await result.current.downloadOperationalBackup();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://lumine-api.vercel.app/api/admin/operational-backup/download',
      expect.objectContaining({
        method: 'GET',
        headers: { 'X-User-Jwt': 'jwt' },
      })
    );
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(result.current.backupNotice).toMatch(/backup operacional baixado/i);
  });
});
