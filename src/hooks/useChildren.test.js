import { renderHook, act } from '@testing-library/react';
import useChildren from './useChildren';

describe('useChildren hook', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('adds child locally when offline', async () => {
    let childrenState = [];
    let pendingState = 0;

    const setChildren = updater => {
      childrenState = typeof updater === 'function' ? updater(childrenState) : updater;
    };
    const setPendingChanges = updater => {
      pendingState = typeof updater === 'function' ? updater(pendingState) : updater;
    };

    const { result } = renderHook(() =>
      useChildren({
        apiUrl: 'https://api.test/sync',
        jsonHeaders: {},
        isOnline: false,
        normalizeChild: input => ({ child: input, changed: false }),
        setChildren,
        setSelectedChild: jest.fn(),
        setPendingChanges,
        setDataRev: jest.fn(),
        setLastSync: jest.fn(),
      })
    );

    let ok;
    await act(async () => {
      ok = await result.current.addChild({ name: 'Teste', enrollmentStatus: 'em_triagem' });
    });

    expect(childrenState).toHaveLength(1);
    expect(childrenState[0].name).toBe('Teste');
    expect(childrenState[0].enrollmentStatus).toBe('em_triagem');
    expect(pendingState).toBe(1);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  test('syncs addChild and applies returned childId/dataRev when online', async () => {
    let childrenState = [];
    let pendingState = 0;
    const setDataRev = jest.fn();
    const setLastSync = jest.fn();

    const setChildren = updater => {
      childrenState = typeof updater === 'function' ? updater(childrenState) : updater;
    };
    const setPendingChanges = updater => {
      pendingState = typeof updater === 'function' ? updater(pendingState) : updater;
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, childId: 'CRI-1234', dataRev: 11 }),
    });

    const { result } = renderHook(() =>
      useChildren({
        apiUrl: 'https://api.test/sync',
        jsonHeaders: { Authorization: 'Bearer test' },
        isOnline: true,
        normalizeChild: input => ({ child: input, changed: false }),
        setChildren,
        setSelectedChild: jest.fn(),
        setPendingChanges,
        setDataRev,
        setLastSync,
      })
    );

    let ok;
    await act(async () => {
      ok = await result.current.addChild({ name: 'Online Child' });
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(childrenState).toHaveLength(1);
    expect(childrenState[0].childId).toBe('CRI-1234');
    expect(pendingState).toBe(0);
    expect(setDataRev).toHaveBeenCalledWith(11);
    expect(setLastSync).toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  test('returns false when online addChild request fails', async () => {
    let childrenState = [];
    let pendingState = 0;

    const setChildren = updater => {
      childrenState = typeof updater === 'function' ? updater(childrenState) : updater;
    };
    const setPendingChanges = updater => {
      pendingState = typeof updater === 'function' ? updater(pendingState) : updater;
    };

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: 'INTERNAL_ERROR' }),
    });

    const { result } = renderHook(() =>
      useChildren({
        apiUrl: 'https://api.test/sync',
        jsonHeaders: { Authorization: 'Bearer test' },
        isOnline: true,
        normalizeChild: input => ({ child: input, changed: false }),
        setChildren,
        setSelectedChild: jest.fn(),
        setPendingChanges,
        setDataRev: jest.fn(),
        setLastSync: jest.fn(),
      })
    );

    let ok;
    await act(async () => {
      ok = await result.current.addChild({ name: 'Falha Child' });
    });

    expect(ok).toBe(false);
    expect(childrenState).toHaveLength(1);
    expect(pendingState).toBe(1);
  });

  test('deletes child and related records locally when offline', async () => {
    let childrenState = [
      { id: 'c1', name: 'Ana' },
      { id: 'c2', name: 'Bia' },
    ];
    let recordsState = [
      { id: 'r1', childInternalId: 'c1', date: '2026-02-01' },
      { id: 'r2', childInternalId: 'c2', date: '2026-02-01' },
    ];
    let pendingState = 0;

    const setChildren = updater => {
      childrenState = typeof updater === 'function' ? updater(childrenState) : updater;
    };
    const setDailyRecords = updater => {
      recordsState = typeof updater === 'function' ? updater(recordsState) : updater;
    };
    const setPendingChanges = updater => {
      pendingState = typeof updater === 'function' ? updater(pendingState) : updater;
    };

    const { result } = renderHook(() =>
      useChildren({
        apiUrl: 'https://api.test/sync',
        jsonHeaders: {},
        isOnline: false,
        normalizeChild: input => ({ child: input, changed: false }),
        dailyRecords: recordsState,
        setChildren,
        setDailyRecords,
        setSelectedChild: jest.fn(),
        setPendingChanges,
        setDataRev: jest.fn(),
        setLastSync: jest.fn(),
      })
    );

    let ok;
    await act(async () => {
      ok = await result.current.deleteChild('c1');
    });

    expect(ok).toBe(true);
    expect(childrenState).toEqual([{ id: 'c2', name: 'Bia' }]);
    expect(recordsState).toEqual([{ id: 'r2', childInternalId: 'c2', date: '2026-02-01' }]);
    expect(pendingState).toBe(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('deletes child online and applies returned dataRev', async () => {
    let childrenState = [{ id: 'c1', name: 'Ana' }];
    let recordsState = [{ id: 'r1', childInternalId: 'c1', date: '2026-02-01' }];
    let pendingState = 0;
    const setDataRev = jest.fn();
    const setLastSync = jest.fn();

    const setChildren = updater => {
      childrenState = typeof updater === 'function' ? updater(childrenState) : updater;
    };
    const setDailyRecords = updater => {
      recordsState = typeof updater === 'function' ? updater(recordsState) : updater;
    };
    const setPendingChanges = updater => {
      pendingState = typeof updater === 'function' ? updater(pendingState) : updater;
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, dataRev: 15 }),
    });

    const { result } = renderHook(() =>
      useChildren({
        apiUrl: 'https://api.test/sync',
        jsonHeaders: { Authorization: 'Bearer test' },
        isOnline: true,
        normalizeChild: input => ({ child: input, changed: false }),
        dailyRecords: recordsState,
        setChildren,
        setDailyRecords,
        setSelectedChild: jest.fn(),
        setPendingChanges,
        setDataRev,
        setLastSync,
      })
    );

    let ok;
    await act(async () => {
      ok = await result.current.deleteChild('c1');
    });

    expect(ok).toBe(true);
    expect(childrenState).toEqual([]);
    expect(recordsState).toEqual([]);
    expect(pendingState).toBe(0);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][1].body).toContain('"action":"deleteChild"');
    expect(setDataRev).toHaveBeenCalledWith(15);
    expect(setLastSync).toHaveBeenCalled();
  });

  test('returns false when online delete request fails', async () => {
    let childrenState = [{ id: 'c1', name: 'Ana' }];
    let recordsState = [{ id: 'r1', childInternalId: 'c1', date: '2026-02-01' }];
    let pendingState = 0;

    const setChildren = updater => {
      childrenState = typeof updater === 'function' ? updater(childrenState) : updater;
    };
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

    const { result } = renderHook(() =>
      useChildren({
        apiUrl: 'https://api.test/sync',
        jsonHeaders: { Authorization: 'Bearer test' },
        isOnline: true,
        normalizeChild: input => ({ child: input, changed: false }),
        dailyRecords: recordsState,
        setChildren,
        setDailyRecords,
        setSelectedChild: jest.fn(),
        setPendingChanges,
        setDataRev: jest.fn(),
        setLastSync: jest.fn(),
      })
    );

    let ok;
    await act(async () => {
      ok = await result.current.deleteChild('c1');
    });

    expect(ok).toBe(false);
    expect(childrenState).toEqual([]);
    expect(recordsState).toEqual([]);
    expect(pendingState).toBe(1);
  });
});
