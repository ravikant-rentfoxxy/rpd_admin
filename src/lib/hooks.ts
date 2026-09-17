'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

type State<T> = { data: T | null; error: string; loading: boolean };

/**
 * Loads `path` and reloads whenever it changes. Pass null to skip.
 * Keeps the previous data visible while a new page or filter is loading.
 */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ data: null, error: '', loading: Boolean(path) });
  const request = useRef(0);

  const load = useCallback(async () => {
    if (!path) return;
    const id = ++request.current;
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await api<T>(path);
      if (id === request.current) setState({ data, error: '', loading: false });
    } catch (err) {
      if (id === request.current) {
        setState((prev) => ({ ...prev, loading: false, error: err instanceof Error ? err.message : 'Could not load' }));
      }
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}

export function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Runs a mutation with a busy flag; returns true on success. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (action: () => Promise<unknown>, onError?: (message: string) => void) => {
    setBusy(true);
    try {
      await action();
      return true;
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Something went wrong');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, run };
}
