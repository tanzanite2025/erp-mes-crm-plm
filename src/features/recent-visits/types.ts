import type { TranslationKey } from '@/locales'

export type RecentVisit = {
  path: string
  labelKey?: TranslationKey
  visitedAt: string
  count: number
}
