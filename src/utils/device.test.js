import { getOrCreateDeviceId, DEVICE_ID_STORAGE_KEY } from './device';

describe('device helpers', () => {
  test('returns existing device id from storage', () => {
    const storage = {
      getItem: jest.fn().mockReturnValue('existing-id'),
      setItem: jest.fn(),
    };

    const id = getOrCreateDeviceId({ storage });

    expect(id).toBe('existing-id');
    expect(storage.getItem).toHaveBeenCalledWith(DEVICE_ID_STORAGE_KEY);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('generates uuid from crypto when available', () => {
    const storage = {
      getItem: jest.fn().mockReturnValue(''),
      setItem: jest.fn(),
    };

    const id = getOrCreateDeviceId({
      storage,
      cryptoApi: { randomUUID: () => 'uuid-generated' },
    });

    expect(id).toBe('uuid-generated');
    expect(storage.setItem).toHaveBeenCalledWith(DEVICE_ID_STORAGE_KEY, 'uuid-generated');
  });

  test('generates fallback id when crypto is unavailable', () => {
    const storage = {
      getItem: jest.fn().mockReturnValue(''),
      setItem: jest.fn(),
    };

    const id = getOrCreateDeviceId({
      storage,
      cryptoApi: null,
      now: () => 123,
      random: () => 0.5,
    });

    expect(id.startsWith('device-123-')).toBe(true);
    expect(storage.setItem).toHaveBeenCalled();
  });

  test('returns empty string when storage is unavailable', () => {
    expect(getOrCreateDeviceId({ storage: null })).toBe('');
  });
});
