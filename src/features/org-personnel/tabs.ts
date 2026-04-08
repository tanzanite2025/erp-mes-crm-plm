import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getOrgPersonnelTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'org', label: t('orgPersonnel.tabs.org'), href: '/personnel/org' },
    { key: 'employees', label: t('orgPersonnel.tabs.employees'), href: '/personnel/employees' },
    { key: 'accounts', label: t('orgPersonnel.tabs.accounts'), href: '/personnel/accounts' },
    { key: 'rights', label: t('orgPersonnel.tabs.rights'), href: '/personnel/rights' },
    { key: 'permissions', label: t('orgPersonnel.tabs.permissions'), href: '/personnel/permissions' },
    { key: 'line', label: t('orgPersonnel.tabs.line'), href: '/personnel/line' },
    { key: 'topology', label: t('orgPersonnel.tabs.topology'), href: '/personnel/topology' },
    { key: 'leave', label: t('orgPersonnel.tabs.leave'), href: '/personnel/leave' },
    { key: 'stats', label: t('orgPersonnel.tabs.stats'), href: '/personnel/stats' },
  ]
}
