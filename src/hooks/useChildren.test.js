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

    await act(async () => {
      await result.current.addChild({ name: 'Teste', enrollmentStatus: 'em_triagem' });
    });

    expect(childrenState).toHaveLength(1);
    expect(childrenState[0].name).toBe('Teste');
    expect(childrenState[0].enrollmentStatus).toBe('em_triagem');
    expect(pendingState).toBe(1);
    expect(global.fetch).not.toHaveBeenCalled();
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

    await act(async () => {
      await result.current.addChild({ name: 'Online Child' });
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(childrenState).toHaveLength(1);
    expect(childrenState[0].childId).toBe('CRI-1234');
    expect(pendingState).toBe(0);
    expect(setDataRev).toHaveBeenCalledWith(11);
    expect(setLastSync).toHaveBeenCalled();
  });
});
