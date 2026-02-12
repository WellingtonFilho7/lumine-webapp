const DEVICE_ID_STORAGE_KEY = 'lumine_device_id';

export function getOrCreateDeviceId({
  storage = typeof window !== 'undefined' ? window.localStorage : null,
  cryptoApi = typeof crypto !== 'undefined' ? crypto : null,
  now = () => Date.now(),
  random = () => Math.random(),
} = {}) {
  if (!storage) return '';

  const stored = storage.getItem(DEVICE_ID_STORAGE_KEY);
  if (stored) return stored;

  const generated =
    cryptoApi && typeof cryptoApi.randomUUID === 'function'
      ? cryptoApi.randomUUID()
      : `device-${now()}-${random().toString(16).slice(2)}`;

  storage.setItem(DEVICE_ID_STORAGE_KEY, generated);
  return generated;
}

export { DEVICE_ID_STORAGE_KEY };
