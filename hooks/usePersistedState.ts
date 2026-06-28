import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * useState that persists to localStorage under `key`. Survives page navigation
 * and logout (localStorage is not cleared on sign-out). SSR-safe: falls back to
 * `defaultValue` on the server and during the first client render before the
 * stored value is read.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota / serialization errors */
    }
  }, [key, value]);

  return [value, setValue];
}
