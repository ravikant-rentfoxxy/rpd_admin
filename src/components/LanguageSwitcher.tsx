'use client';

import { LOCALES, useLocale, useT, type Locale } from '@/lib/i18n';
import { Icon } from './icons';

/**
 * Language pill, matching the one in the RPD app's app bars.
 *
 * A native <select> sits invisibly over the pill so the control stays keyboard
 * accessible and uses the platform picker on phones.
 */
export function LanguageSwitcher({ onDark = false }: { onDark?: boolean }) {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const current = LOCALES.find((item) => item.code === locale) ?? LOCALES[1]!;

  return (
    <span
      className="lang-pill"
      data-on-dark={onDark ? '' : undefined}
      title={t('choose_language')}
    >
      <Icon.Globe />
      <b>{current.label}</b>
      <select
        aria-label={t('choose_language')}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        {LOCALES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label} · {item.name}
          </option>
        ))}
      </select>
    </span>
  );
}
