import type { TabItem } from '@/components/module-tabs'
import type { AppLocale, TranslationKey } from '@/locales'
import { getMaterialCategoryOptions } from './data/material-category-options'

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

export function getMaterialRouteTabs(locale: AppLocale, t: TranslateFn): TabItem[] {
  const dynamicTabs = getMaterialCategoryOptions(locale).map((opt) => ({
    key: opt.value.toLowerCase(),
    label: opt.label,
    href: `/materials/${opt.value}`,
  }))

  return [...getMaterialStaticTabs(t), ...dynamicTabs]
}
