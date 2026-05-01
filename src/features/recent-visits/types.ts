import type { TranslationKey } from '@/locales'

export type RecentVisit = {
  path: string
  labelKey?: TranslationKey
  fallbackLabel: string
  visitedAt: string
  count: number
}

