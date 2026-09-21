'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { bho } from './locales/bho';
import { en } from './locales/en';
import { hi } from './locales/hi';

export type Locale = 'en' | 'hi' | 'bho';

/** Same order and short labels as the language pill in the RPD app. */
export const LOCALES: { code: Locale; label: string; name: string }[] = [
  { code: 'hi', label: 'HI', name: 'हिन्दी' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'bho', label: 'BHO', name: 'भोजपुरी' },
];

const DICTS: Record<Locale, Record<string, string>> = { en, hi, bho };

const STORAGE_KEY = 'rpd_admin_locale';
const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'hi' || value === 'bho';
}

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // Private browsing or blocked storage: fall back to the default.
  }
  return DEFAULT_LOCALE;
}

// The whole portal is client-rendered, so a module-level locale lets plain
// helpers (format.ts, label maps) translate without threading a hook through
// every call site. LocaleProvider keeps this in step with React state.
let active: Locale = DEFAULT_LOCALE;

export function activeLocale() {
  return active;
}

/**
 * Translate `key`, substituting `@name` placeholders from `params`.
 *
 * Falls back to English, then to the key itself, so a missing translation
 * shows readable text rather than a blank.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const value = DICTS[active][key] ?? DICTS.en[key] ?? key;
  if (!params) return value;
  return Object.entries(params).reduce(
    (text, [name, replacement]) => text.split(`@${name}`).join(`${replacement}`),
    value,
  );
}

/** The locale tag to hand `toLocaleString`. Bhojpuri has no CLDR data, so it borrows Hindi's. */
export function intlLocale(locale: Locale = active) {
  return locale === 'en' ? 'en-IN' : 'hi-IN';
}

const LocaleContext = createContext<{ locale: Locale; setLocale: (next: Locale) => void }>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Starts at the default so the server and first client render agree; the
  // stored choice is applied right after mount.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Set before children render, so helpers called during this pass see it.
  active = locale;

  useEffect(() => {
    const saved = readStoredLocale();
    if (saved !== locale) setLocaleState(saved);
    // Only on mount: later changes go through setLocale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'hi';
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    active = next;
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Nothing to do — the choice just will not survive a reload.
    }
  }, []);

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

/** Current locale plus a setter. Components that only need text can import `t` directly. */
export function useLocale() {
  return useContext(LocaleContext);
}

/**
 * Subscribes the caller to locale changes and returns the translator.
 *
 * Any component rendering translated text should use this rather than the bare
 * `t`, so it re-renders when the language changes.
 */
export function useT() {
  useContext(LocaleContext);
  return t;
}
