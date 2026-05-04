import { format } from 'date-fns'
import type { AppLocale } from '@/locales'

const WAREHOUSE_DISPLAY_DATETIME_FORMATS: Record<AppLocale, string> = {
  'zh-CN': 'yyyy-MM-dd HH:mm',
  'en-US': 'yyyy-MM-dd HH:mm',
}

export function formatWarehouseDisplayDateTime(
  value: string | Date,
  locale: AppLocale = 'zh-CN'
): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : ''
  }
  return format(date, WAREHOUSE_DISPLAY_DATETIME_FORMATS[locale] || WAREHOUSE_DISPLAY_DATETIME_FORMATS['zh-CN'])
}
