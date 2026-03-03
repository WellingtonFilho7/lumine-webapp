import { useCallback, useState } from 'react';

export default function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(value => {
    setStoredValue(prevValue => {
      const valueToStore = value instanceof Function ? value(prevValue) : value;
      try {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch {
        // Storage pode falhar (quota/restricoes), mas o estado em memoria deve continuar funcionando.
      }
      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue];
}
