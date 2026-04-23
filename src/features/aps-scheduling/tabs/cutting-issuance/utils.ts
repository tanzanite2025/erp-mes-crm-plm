import { type AppLocale } from '@/locales'

function resolveLocaleTag(locale: AppLocale): string {
  return locale === 'zh-CN' ? 'zh-CN' : 'en-US'
}

function hasExplicitTime(value: string): boolean {
  return value.includes('T') || /\s\d{1,2}:\d{2}/.test(value)
}

export function formatDateLabel(value: string | undefined, locale: AppLocale): string {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const localeTag = resolveLocaleTag(locale)

  if (hasExplicitTime(value)) {
    return new Intl.DateTimeFormat(localeTag, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  }

  return new Intl.DateTimeFormat(localeTag, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatNumber(value: number | undefined, locale: AppLocale): string {
  if (!Number.isFinite(value)) {
    return '0'
  }

  return new Intl.NumberFormat(resolveLocaleTag(locale)).format(Number(value))
}
