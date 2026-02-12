import { renderHook, act, waitFor } from '@testing-library/react';
import useSync from './useSync';

function createJsonResponse(payload, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => payload,
  };
}

function createBaseProps(overrides = {}) {
  return {
    apiUrl: 'https://api.test/sync',
    baseHeaders: { Authorization: 'Bearer t' },
    jsonHeaders: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
    children: [{ id: 'c1', name: 'A' }],
    dailyRecords: [{ id: 'r1', childInternalId: 'c1', date: '2026-02-12' }],
    isOnline: true,
    dataRev: 1,
    setDataRev: jest.fn(),
    setLastSync: jest.fn(),
    setChildren: jest.fn(),
    setDailyRecords: jest.fn(),
    normalizeChildren: jest.fn(input => ({ children: input, changed: false })),
    normalizeRecords: jest.fn(input => ({ records: input, changed: false })),
    pendingChanges: 0,
    setPendingChanges: jest.fn(),
    reviewMode: false,
    ...overrides,
  };
}

describe('useSync hook', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns warning when offline', async () => {
    const props = createBaseProps({ isOnline: false });
    const { result } = renderHook(() => useSync(props));

    let ok;
    await act(async () => {
      ok = await result.current.syncWithServer();
    });

    expect(ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.syncStatus).toBe('error');
      expect(result.current.syncError).toContain('Sem internet');
      expect(result.current.syncErrorLevel).toBe('warning');
    });
  });

  test('opens server-new modal when server revision is ahead in manual sync', async () => {
    const props = createBaseProps({ dataRev: 1 });
    global.fetch.mockResolvedValueOnce(
      createJsonResponse({ success: true, dataRev: 2, data: { children: [], records: [] } })
    );

    const { result } = renderHook(() => useSync(props));

    let ok;
    await act(async () => {
      ok = await result.current.syncWithServer(null, 'manual');
    });

    expect(ok).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(props.setDataRev).toHaveBeenCalledWith(2);

    await waitFor(() => {
      expect(result.current.syncModal).toEqual({
        type: 'server-new',
        message: 'Há dados novos no servidor. Baixe os dados atuais antes de sincronizar.',
      });
    });
  });

  test('opens revision-mismatch modal when overwrite returns 409', async () => {
    const props = createBaseProps({ dataRev: 3 });
    global.fetch
      .mockResolvedValueOnce(createJsonResponse({ success: true, dataRev: 3 }))
      .mockResolvedValueOnce(
        createJsonResponse(
          { success: false, error: 'REVISION_MISMATCH', message: 'conflict' },
          false,
          409
        )
      );

    const { result } = renderHook(() => useSync(props));

    let ok;
    await act(async () => {
      ok = await result.current.syncWithServer(null, 'manual');
    });

    expect(ok).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await waitFor(() => {
      expect(result.current.syncModal).toEqual({
        type: 'revision-mismatch',
        message: 'Os dados foram alterados por outro dispositivo. Baixe a versão atual.',
      });
    });
  });

  test('downloads data and updates local state on success', async () => {
    const props = createBaseProps({ pendingChanges: 2 });
    const payload = {
      success: true,
      data: {
        children: [{ id: 'c2', name: 'Nova' }],
        records: [{ id: 'r2', childInternalId: 'c2', date: '2026-02-12' }],
      },
      dataRev: 9,
    };
    global.fetch.mockResolvedValueOnce(createJsonResponse(payload));

    const { result } = renderHook(() => useSync(props));

    let ok;
    await act(async () => {
      ok = await result.current.downloadFromServer();
    });

    expect(ok).toBe(true);
    expect(props.normalizeChildren).toHaveBeenCalledWith(payload.data.children);
    expect(props.normalizeRecords).toHaveBeenCalledWith(payload.data.records);
    expect(props.setChildren).toHaveBeenCalledWith(payload.data.children);
    expect(props.setDailyRecords).toHaveBeenCalledWith(payload.data.records);
    expect(props.setPendingChanges).toHaveBeenCalledWith(0);
    expect(props.setDataRev).toHaveBeenCalledWith(9);
    expect(props.setLastSync).toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.syncStatus).toBe('success');
    });
  });
});
