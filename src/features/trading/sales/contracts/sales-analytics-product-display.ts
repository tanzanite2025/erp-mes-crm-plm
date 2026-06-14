export const SALES_ANALYTICS_PRODUCT_DISPLAY_STRATEGY_VERSION =
  'product-display-v1' as const

export interface SalesAnalyticsProductDisplay {
  title: string
  subtitle: string
  code: string
  fullLabel: string
  strategyVersion: typeof SALES_ANALYTICS_PRODUCT_DISPLAY_STRATEGY_VERSION
}
