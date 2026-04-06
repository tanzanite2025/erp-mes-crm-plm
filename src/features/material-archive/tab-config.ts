import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getMaterialStaticTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'all', label: t('materialArchive.layout.tabs.all'), href: '/materials/all' },
    { key: 'assembly', label: t('materialArchive.layout.tabs.assembly'), href: '/materials/assembly' },
  ]
}

export function getMaterialPermissionTabs(t: TranslateFn): TabItem[] {
  return [
    ...getMaterialStaticTabs(t),
    { key: 'category', label: t('materialArchive.layout.categoryDialogTitle'), href: '/materials/:category' },
  ]
}
