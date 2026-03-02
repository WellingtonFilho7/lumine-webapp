import { renderHook, act } from '@testing-library/react';
import useRecords from './useRecords';

describe('useRecords hook', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('upserts existing record online and updates local state', async () => {
    let recordsState = [{ id: 'r-existing', childInternalId: 'c1', date: '2026-02-12' }];
    let pendingState = 0;

    const setDailyRecords = updater => {
      recordsState = typeof updater === 'function' ? updater(recordsState) : updater;
    };
    const setPendingChanges = updater => {
      pendingState = typeof updater === 'function' ? updater(pendingState) : updater;
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { dataRev: 22, record: { mood: 'happy' } } }),
    });

    const setDataRev = jest.fn();
    const setLastSync = jest.fn();

    const { result } = renderHook(() =>
      useRecords({
        apiBaseUrl: 'https://api.test',
        jsonHeaders: {},
        isOnline: true,
        dailyRecords: recordsState,
        setDailyRecords,
        setPendingChanges,
        setDataRev,
        setLastSync,
        upsertDailyRecord: () => ({
          recordPayload: { id: 'r-existing', childInternalId: 'c1', date: '2026-02-12' },
          nextRecords: [{ id: 'r-existing', childInternalId: 'c1', date: '2026-02-12' }],
        }),
      })
    );

    let ok;
    await act(async () => {
      ok = await result.current.addDailyRecord({ childInternalId: 'c1', date: '2026-02-12' });
    });

    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(setDataRev).toHaveBeenCalledWith(22);
    expect(setLastSync).toHaveBeenCalled();
    expect(pendingState).toBe(0);
  });

  test('posts records/upsert for new record and applies dataRev', async () => {
    let recordsState = [];
    let pendingState = 0;
    const setDataRev = jest.fn();
    const setLastSync = jest.fn();

    const setDailyRecords = updater => {
      recordsState = typeof updater === 'function' ? updater(recordsState) : updater;
    };
    const setPendingChanges = updater => {
      pendingState = typeof updater === 'function' ? updater(pendingState) : updater;
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { dataRev: 12 } }),
    });

    const nextRecords = [{ id: 'r-new', childInternalId: 'c1', date: '2026-02-12' }];

    const { result } = renderHook(() =>
      useRecords({
        apiBaseUrl: 'https://api.test',
        jsonHeaders: { Authorization: 'Bearer x' },
        isOnline: true,
        dailyRecords: [],
        setDailyRecords,
        setPendingChanges,
        setDataRev,
        setLastSync,
        upsertDailyRecord: () => ({
          recordPayload: { id: 'r-new', childInternalId: 'c1', date: '2026-02-12' },
          nextRecords,
        }),
      })
    );

    let ok;
    await act(async () => {
      ok = await result.current.addDailyRecord({ childInternalId: 'c1', date: '2026-02-12' });
    });

    expect(recordsState).toEqual(nextRecords);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [fetchUrl, fetchConfig] = global.fetch.mock.calls[0];
    expect(fetchUrl).toContain('/records/upsert');
    expect(fetchConfig.method).toBe('POST');
    expect(fetchConfig.body).toContain('"data":');
    expect(pendingState).toBe(0);
    expect(setDataRev).toHaveBeenCalledWith(12);
    expect(setLastSync).toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  test('returns false when records/upsert request fails online', async () => {
    let recordsState = [];
    let pendingState = 0;

    const setDailyRecords = updater => {
      recordsState = typeof updater === 'function' ? updater(recordsState) : updater;
    };
    const setPendingChanges = updater => {
      pendingState = typeof updater === 'function' ? updater(pendingState) : updater;
    };

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: 'INTERNAL_ERROR' }),
    });

    const nextRecords = [{ id: 'r-fail', childInternalId: 'c1', date: '2026-02-12' }];

    const { result } = renderHook(() =>
      useRecords({
        apiBaseUrl: 'https://api.test',
        jsonHeaders: { Authorization: 'Bearer x' },
        isOnline: true,
        dailyRecords: [],
        setDailyRecords,
        setPendingChanges,
        setDataRev: jest.fn(),
        setLastSync: jest.fn(),
        upsertDailyRecord: () => ({
          recordPayload: { id: 'r-fail', childInternalId: 'c1', date: '2026-02-12' },
          nextRecords,
        }),
      })
    );

    let ok;
    await act(async () => {
      ok = await result.current.addDailyRecord({ childInternalId: 'c1', date: '2026-02-12' });
    });

    expect(ok).toBe(false);
    expect(recordsState).toEqual([]);
    expect(pendingState).toBe(0);
  });
});
