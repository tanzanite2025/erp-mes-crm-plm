import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getBusinessAnalysisTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'overview',
      label: t('businessAnalysis.tabs.overview'),
      href: '/business-analysis/overview',
    },
    {
      key: 'production-capacity',
      label: t('businessAnalysis.tabs.productionCapacity'),
      href: '/business-analysis/production-capacity',
    },
    {
      key: 'production-load',
      label: t('businessAnalysis.tabs.productionLoad'),
      href: '/business-analysis/production-load',
    },
    {
      key: 'production-efficiency',
      label: t('businessAnalysis.tabs.productionEfficiency'),
      href: '/business-analysis/production-efficiency',
    },
    {
      key: 'scrap',
      label: t('businessAnalysis.tabs.scrap'),
      href: '/business-analysis/scrap',
    },
    {
      key: 'defect-trend',
      label: t('businessAnalysis.tabs.defectTrend'),
      href: '/business-analysis/defect-trend',
    },
    {
      key: 'orders',
      label: t('businessAnalysis.tabs.orders'),
      href: '/business-analysis/orders',
    },
    {
      key: 'customers',
      label: t('businessAnalysis.tabs.customers'),
      href: '/business-analysis/customers',
    },
  ]
}
