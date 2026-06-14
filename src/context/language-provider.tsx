import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  type AppLocale,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type TranslationKey,
  translate,
} from '@/locales'
import { getCookie, removeCookie, setCookie } from '@/lib/cookies'
import { LANGUAGE_COOKIE_NAME } from '@/lib/locale'

const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

type LanguageProviderProps = {
  children: React.ReactNode
  defaultLocale?: AppLocale
  storageKey?: string
}

type LanguageContextState = {
  defaultLocale: AppLocale
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  resetLocale: () => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const initialState: LanguageContextState = {
  defaultLocale: DEFAULT_LOCALE,
  locale: DEFAULT_LOCALE,
  setLocale: () => null,
  resetLocale: () => null,
  t: (key) => key,
}

const LanguageContext = createContext<LanguageContextState>(initialState)

function isSupportedLocale(locale: string | undefined): locale is AppLocale {
  return !!locale && SUPPORTED_LOCALES.includes(locale as AppLocale)
}

export function LanguageProvider({
  children,
  defaultLocale = DEFAULT_LOCALE,
  storageKey = LANGUAGE_COOKIE_NAME,
}: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<AppLocale>(() => {
    const stored = getCookie(storageKey)
    return isSupportedLocale(stored) ? stored : defaultLocale
  })

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = (nextLocale: AppLocale) => {
    setCookie(storageKey, nextLocale, LANGUAGE_COOKIE_MAX_AGE)
    setLocaleState(nextLocale)
  }

  const resetLocale = () => {
    removeCookie(storageKey)
    setLocaleState(defaultLocale)
  }

  const contextValue = useMemo<LanguageContextState>(
    () => ({
      defaultLocale,
      locale,
      setLocale,
      resetLocale,
      t: (key, params) => translate(locale, key, params),
    }),
    [defaultLocale, locale]
  )

  return <LanguageContext value={contextValue}>{children}</LanguageContext>
}

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context)
    throw new Error('useLanguage must be used within a LanguageProvider')

  return context
}
