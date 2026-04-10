import { type Product } from '../data/schema'
import { ProductCoreService } from '../services/product-core-service'
import { getProductAttributeSummary } from './product-attribute-utils'

export function formatProductDisplayName(product: Product) {
  return ProductCoreService.formatDisplay(product)
}

export function getProductAttributes(product: Product) {
  const summary = getProductAttributeSummary(product)
  return {
    name: product.name,
    version: summary.version,
    series: summary.series,
    brake: summary.brake,
    weight: product.weight ? `${product.weight}g` : '-',
  }
}
