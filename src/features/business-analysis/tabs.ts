import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export type BusinessAnalysisDomain = 'production' | 'quality' | 'customerSales'

export const BUSINESS_ANALYSIS_DOMAIN_ROUTES = {
  production: [
    '/business-analysis/production-capacity',
    '/business-analysis/production-load',
    '/business-analysis/production-efficiency',
  ],
  quality: ['/business-analysis/scrap', '/business-analysis/defect-trend'],
  customerSales: ['/business-analysis/orders', '/business-analysis/customers'],
} as const satisfies Record<BusinessAnalysisDomain, readonly string[]>

type BusinessAnalysisTabDefinition = {
  key: string
  labelKey: TranslationKey
  href: string
}

const BUSINESS_ANALYSIS_TAB_DEFINITIONS: Record<
  BusinessAnalysisDomain,
  readonly BusinessAnalysisTabDefinition[]
> = {
  production: [
    {
      key: 'production-capacity',
      labelKey: 'businessAnalysis.tabs.productionCapacity',
      href: '/business-analysis/production-capacity',
    },
    {
      key: 'production-load',
      labelKey: 'businessAnalysis.tabs.productionLoad',
      href: '/business-analysis/production-load',
    },
    {
      key: 'production-efficiency',
      labelKey: 'businessAnalysis.tabs.productionEfficiency',
      href: '/business-analysis/production-efficiency',
    },
  ],
  quality: [
    {
      key: 'scrap',
      labelKey: 'businessAnalysis.tabs.scrap',
      href: '/business-analysis/scrap',
    },
    {
      key: 'defect-trend',
      labelKey: 'businessAnalysis.tabs.defectTrend',
      href: '/business-analysis/defect-trend',
    },
  ],
  customerSales: [
    {
      key: 'orders',
      labelKey: 'businessAnalysis.tabs.orders',
      href: '/business-analysis/orders',
    },
    {
      key: 'customers',
      labelKey: 'businessAnalysis.tabs.customers',
      href: '/business-analysis/customers',
    },
  ],
}

export function getBusinessAnalysisDomain(
  pathname: string
): BusinessAnalysisDomain | undefined {
  if (
    BUSINESS_ANALYSIS_DOMAIN_ROUTES.quality.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  ) {
    return 'quality'
  }

  if (
    BUSINESS_ANALYSIS_DOMAIN_ROUTES.customerSales.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  ) {
    return 'customerSales'
  }

  if (
    BUSINESS_ANALYSIS_DOMAIN_ROUTES.production.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  ) {
    return 'production'
  }

  return undefined
}

export function getBusinessAnalysisTabs(
  t: TranslateFn,
  domain: BusinessAnalysisDomain | undefined
): TabItem[] {
  if (!domain) {
    return []
  }

  return BUSINESS_ANALYSIS_TAB_DEFINITIONS[domain].map((tab) => ({
    key: tab.key,
    label: t(tab.labelKey),
    href: tab.href,
  }))
}
