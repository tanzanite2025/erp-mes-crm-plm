import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TabTranslator = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getApsSchedulingTabs(t: TabTranslator): TabItem[] {
  return [
    { key: 'board', label: t('apsScheduling.layout.tabs.board'), href: '/aps-scheduling/board' },
    { key: 'engine-config', label: t('apsScheduling.layout.tabs.engineConfig'), href: '/aps-scheduling/engine-config' },
  ]
}
