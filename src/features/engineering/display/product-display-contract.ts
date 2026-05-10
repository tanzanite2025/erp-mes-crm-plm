import { type Product, type ProductAttributeValue } from '../data/schema'
import { getProductAttributeSummary } from '../utils/product-attribute-utils'

export const PRODUCT_DISPLAY_STRATEGY_VERSION = 'product-display-v1' as const

export interface ProductDisplayFacts {
  name?: string
  sku?: string
  modelCode?: string
  attributeValues?: ProductAttributeValue[]
}

export interface ProductDisplayProjection {
  title: string
  subtitle: string
  code: string
  fullLabel: string
  strategyVersion: typeof PRODUCT_DISPLAY_STRATEGY_VERSION
}

function normalizeDisplayValue(value?: string | null): string {
  return value?.trim() ?? ''
}

function buildDisplaySubtitle(facts: ProductDisplayFacts): string {
  const summary = getProductAttributeSummary({
    attributeValues: facts.attributeValues ?? [],
  } as Product)

  return [summary.series, summary.brake, summary.version]
    .map((value) => normalizeDisplayValue(value))
    .filter(Boolean)
    .join('/')
}

export function toProductDisplayFacts(
  product: Product | ProductDisplayFacts | null | undefined
): ProductDisplayFacts | null {
  if (!product) {
    return null
  }

  return {
    name: normalizeDisplayValue(product.name),
    sku: normalizeDisplayValue(product.sku),
    modelCode: normalizeDisplayValue(product.modelCode),
    attributeValues: product.attributeValues ?? [],
  }
}

export function resolveProductDisplay(
  product: Product | ProductDisplayFacts | null | undefined
): ProductDisplayProjection {
  const facts = toProductDisplayFacts(product)
  const code = normalizeDisplayValue(facts?.sku) || normalizeDisplayValue(facts?.modelCode)
  const title = normalizeDisplayValue(facts?.name) || code || 'UNNAMED'
  const subtitle = facts ? buildDisplaySubtitle(facts) : ''

  return {
    title,
    subtitle,
    code,
    fullLabel: subtitle ? `${title} (${subtitle})` : title,
    strategyVersion: PRODUCT_DISPLAY_STRATEGY_VERSION,
  }
}

export function formatProductDisplay(
  product: Product | ProductDisplayFacts | null | undefined
): string {
  return resolveProductDisplay(product).fullLabel
}
