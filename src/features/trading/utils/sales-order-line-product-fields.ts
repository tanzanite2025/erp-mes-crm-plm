import { type ProductDisplayProjectionV2 } from '@/features/engineering/display/product-display-v2'
import { type Product } from '@/features/engineering/data/schema'
import { type SalesOrderLine } from '../data/schema'
import {
  buildSalesOrderLineDisplaySnapshot,
  isSalesOrderLineDisplayPlaceholder,
  mergeSalesOrderLineDisplaySnapshot,
  type SalesOrderLineDisplaySnapshot,
} from './sales-order-line-display-snapshot'

type SalesOrderLineProductBaseFields = Pick<
  SalesOrderLine,
  | 'productModel'
  | 'productCode'
  | 'specification'
  | 'modelCodeSnapshot'
  | 'holePrefixSnapshot'
>

export type SalesOrderLineProductFields = SalesOrderLineProductBaseFields &
  SalesOrderLineDisplaySnapshot

function normalizeLineValue(value?: string | null): string {
  return value?.trim() ?? ''
}

function resolveProductLineCode(product: Product): string {
  return normalizeLineValue(product.sku) || normalizeLineValue(product.modelCode)
}

export function shouldReplaceGeneratedSalesOrderLineValue(
  value?: string | null
): boolean {
  const normalized = normalizeLineValue(value)

  return (
    normalized === '' ||
    isSalesOrderLineDisplayPlaceholder(normalized)
  )
}

export function buildSalesOrderLineProductFields(
  product: Product,
  displayProjection: ProductDisplayProjectionV2
): SalesOrderLineProductFields {
  const displaySnapshot = buildSalesOrderLineDisplaySnapshot(displayProjection)
  const productCode = resolveProductLineCode(product)

  return {
    productModel: productCode,
    productCode,
    specification:
      normalizeLineValue(displaySnapshot.productDisplayFullLabelSnapshot) ||
      productCode,
    ...displaySnapshot,
    modelCodeSnapshot: normalizeLineValue(product.modelCode),
    holePrefixSnapshot: normalizeLineValue(product.barcodeConfig?.category),
  }
}

export function mergeSalesOrderLineProductFields(
  line: SalesOrderLine,
  product: Product,
  displayProjection: ProductDisplayProjectionV2
): SalesOrderLineProductFields {
  const derived = buildSalesOrderLineProductFields(product, displayProjection)

  return {
    ...derived,
    productModel: normalizeLineValue(line.productModel) || derived.productModel,
    productCode: normalizeLineValue(line.productCode) || derived.productCode,
    specification: shouldReplaceGeneratedSalesOrderLineValue(line.specification)
      ? derived.specification
      : normalizeLineValue(line.specification),
    ...mergeSalesOrderLineDisplaySnapshot(line, displayProjection),
    modelCodeSnapshot:
      normalizeLineValue(line.modelCodeSnapshot) || derived.modelCodeSnapshot,
    holePrefixSnapshot:
      normalizeLineValue(line.holePrefixSnapshot) || derived.holePrefixSnapshot,
  }
}
