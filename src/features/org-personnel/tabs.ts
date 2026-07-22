import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getOrgPersonnelTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'org', label: t('orgPersonnel.tabs.org'), href: '/personnel/org' },
    {
      key: 'employees',
      label: t('orgPersonnel.tabs.employees'),
      href: '/personnel/employees',
    },
    {
      key: 'accounts',
      label: t('orgPersonnel.tabs.accounts'),
      href: '/personnel/accounts',
    },
    {
      key: 'rights',
      label: t('orgPersonnel.tabs.rights'),
      href: '/personnel/rights',
    },
  ]
}

export function getOrgPersonnelBranchTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'leave',
      label: t('orgPersonnel.tabs.leave'),
      href: '/attendance-management/leave',
    },
    {
      key: 'stats',
      label: t('orgPersonnel.tabs.stats'),
      href: '/attendance-management/hall-of-fame',
    },
  ]
}
