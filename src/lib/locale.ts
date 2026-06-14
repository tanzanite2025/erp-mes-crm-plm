import { getCookie } from '@/lib/cookies'
import { type AppLocale, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/locales'

export const LANGUAGE_COOKIE_NAME = 'vite-ui-language'

function isSupportedLocale(locale: string | undefined): locale is AppLocale {
  return !!locale && SUPPORTED_LOCALES.includes(locale as AppLocale)
}

export function getCurrentLocale(): AppLocale {
  const stored = getCookie(LANGUAGE_COOKIE_NAME)
  return isSupportedLocale(stored) ? stored : DEFAULT_LOCALE
}
