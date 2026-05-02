import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export const basicSettingsTabs: TabItem[] = [
  { key: 'units', label: 'Unit Management', href: '/basic-settings/units' },
  { key: 'knowledge-base', label: 'Knowledge Base', href: '/basic-settings/knowledge-base' },
  { key: 'enterprise', label: 'Enterprise Info', href: '/basic-settings/enterprise' },
  { key: 'security', label: 'Security Settings', href: '/basic-settings/security' },
]

export function getBasicSettingsTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'units', label: t('basicSettings.tabs.units'), href: '/basic-settings/units' },
    { key: 'knowledge-base', label: t('basicSettings.tabs.knowledgeBase'), href: '/basic-settings/knowledge-base' },
    { key: 'enterprise', label: t('basicSettings.tabs.enterprise'), href: '/basic-settings/enterprise' },
    { key: 'security', label: t('basicSettings.tabs.security'), href: '/basic-settings/security' },
  ]
}
