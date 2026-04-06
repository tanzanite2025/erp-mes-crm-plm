import type { TabItem } from '@/components/module-tabs'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export function getQualityTabs(t: TranslateFn): TabItem[] {
  return [
    { key: 'standards', label: t('quality.layout.tabs.standards'), href: '/quality/standards' },
    { key: 'abnormalities', label: t('quality.layout.tabs.abnormalities'), href: '/quality/abnormalities' },
    { key: 'inspection', label: t('quality.layout.tabs.inspection'), href: '/quality/inspection' },
    { key: 'special-buy', label: t('quality.layout.tabs.specialBuy'), href: '/quality/special-buy' },
    { key: 'formulas', label: t('quality.layout.tabs.formulas'), href: '/quality/formulas' },
  ]
}
