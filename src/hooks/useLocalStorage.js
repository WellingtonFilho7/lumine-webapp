import { useState } from 'react';

export default function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = value => {
    try {
      setStoredValue(prevValue => {
        const valueToStore = value instanceof Function ? value(prevValue) : value;
        localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    } catch {
      // Falha silenciosa para nao interromper a UX em dispositivos com storage restrito.
    }
  };

  return [storedValue, setValue];
}
