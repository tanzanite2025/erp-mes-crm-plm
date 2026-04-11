import { type Product } from '../data/schema'
import { ProductCoreService } from '../services/product-core-service'
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
  return ProductCoreService.formatDisplay(product)
}

export function getProductAttributes(product: Product): ProductViewModel {
  const summary = getProductAttributeSummary(product)
  return {
    name: product.name,
    sku: product.sku || '',
    displayName: formatProductDisplayName(product),
    version: summary.version,
    series: summary.series,
    brake: summary.brake,
    tireType: summary.tireType || '-',
    sizeLabel: `${product.depth || '-'}X${product.widthExternal || '-'}`,
    weight: product.weight ? `${product.weight}g` : '-',
    weightUppercase: product.weight ? `${product.weight}G` : '- G',
  }
}
