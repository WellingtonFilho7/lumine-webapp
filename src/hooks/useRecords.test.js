import { renderHook, act } from '@testing-library/react';
import useRecords from './useRecords';

describe('useRecords hook', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('calls syncWithServer for existing record updates when online and not in review mode', async () => {
    let recordsState = [];
    let pendingState = 0;
    const syncWithServer = jest.fn().mockResolvedValue(true);

    const setDailyRecords = updater => {
      recordsState = typeof updater === 'function' ? updater(recordsState) : updater;
    };
    const setPendingChanges = updater => {
      pendingState = typeof updater === 'function' ? updater(pendingState) : updater;
    };

    const nextRecords = [{ id: 'r-existing', childInternalId: 'c1', date: '2026-02-12' }];

    const { result } = renderHook(() =>
      useRecords({
        apiUrl: 'https://api.test/sync',
        jsonHeaders: {},
        isOnline: true,
        reviewMode: false,
        children: [{ id: 'c1' }],
        dailyRecords: [],
        setDailyRecords,
        setPendingChanges,
        setDataRev: jest.fn(),
        setLastSync: jest.fn(),
        syncWithServer,
        upsertDailyRecord: () => ({
          recordPayload: { id: 'unused' },
          nextRecords,
          existed: true,
        }),
      })
    );

    let ok;
    await act(async () => {
      ok = await result.current.addDailyRecord({ childInternalId: 'c1', date: '2026-02-12' });
    });

    expect(recordsState).toEqual(nextRecords);
    expect(pendingState).toBe(1);
    expect(syncWithServer).toHaveBeenCalledWith({ children: [{ id: 'c1' }], records: nextRecords }, 'auto');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  test('posts addRecord for new record and applies dataRev', async () => {
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
      json: async () => ({ success: true, dataRev: 12 }),
    });

    const nextRecords = [{ id: 'r-new', childInternalId: 'c1', date: '2026-02-12' }];

    const { result } = renderHook(() =>
      useRecords({
        apiUrl: 'https://api.test/sync',
        jsonHeaders: { Authorization: 'Bearer x' },
        isOnline: true,
        reviewMode: false,
        children: [{ id: 'c1' }],
        dailyRecords: [],
        setDailyRecords,
        setPendingChanges,
        setDataRev,
        setLastSync,
        syncWithServer: jest.fn(),
        upsertDailyRecord: () => ({
          recordPayload: { id: 'r-new', childInternalId: 'c1', date: '2026-02-12' },
          nextRecords,
          existed: false,
        }),
      })
    );

    let ok;
    await act(async () => {
      ok = await result.current.addDailyRecord({ childInternalId: 'c1', date: '2026-02-12' });
    });

    expect(recordsState).toEqual(nextRecords);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, fetchConfig] = global.fetch.mock.calls[0];
    expect(fetchConfig.method).toBe('POST');
    expect(fetchConfig.body).toContain('"action":"addRecord"');
    expect(pendingState).toBe(0);
    expect(setDataRev).toHaveBeenCalledWith(12);
    expect(setLastSync).toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  test('returns false when addRecord request fails online', async () => {
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
        apiUrl: 'https://api.test/sync',
        jsonHeaders: { Authorization: 'Bearer x' },
        isOnline: true,
        reviewMode: false,
        children: [{ id: 'c1' }],
        dailyRecords: [],
        setDailyRecords,
        setPendingChanges,
        setDataRev: jest.fn(),
        setLastSync: jest.fn(),
        syncWithServer: jest.fn(),
        upsertDailyRecord: () => ({
          recordPayload: { id: 'r-fail', childInternalId: 'c1', date: '2026-02-12' },
          nextRecords,
          existed: false,
        }),
      })
    );

    let ok;
    await act(async () => {
      ok = await result.current.addDailyRecord({ childInternalId: 'c1', date: '2026-02-12' });
    });

    expect(ok).toBe(false);
    expect(recordsState).toEqual(nextRecords);
    expect(pendingState).toBe(1);
  });
});
