import { type Product } from '../data/schema'
import { resolveProductDisplay } from '../display/product-display-contract'
import { getProductAttributeSummary } from './product-attribute-utils'

export type ProductViewModel = {
  name: string
  sku: string
  displayName: string
  version: string
  series: string
  brake: string
  tireType: string
  sizeLabel: string
  weight: string
  weightUppercase: string
}

export function formatProductDisplayName(product: Product) {
  return resolveProductDisplay(product).fullLabel
}

export function getProductAttributes(product: Product): ProductViewModel {
  const summary = getProductAttributeSummary(product)
  const display = resolveProductDisplay(product)

  return {
    name: product.name,
    sku: product.sku,
    displayName: display.fullLabel,
    version: summary.version,
    series: summary.series,
    brake: summary.brake,
    tireType: summary.tireType || '-',
    sizeLabel: `${product.depth || '-'}X${product.widthExternal || '-'}`,
    weight: product.weight ? `${product.weight}g` : '-',
    weightUppercase: product.weight ? `${product.weight}G` : '- G',
  }
}
