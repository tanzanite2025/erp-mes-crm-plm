import { type ProductDisplayProjectionV2 } from '@/features/engineering/display/product-display-v2'
import { type Product } from '@/features/engineering/data/schema'
import { type SalesOrderLine } from '../data/schema'
import {
  buildLegacySalesOrderLineDisplayFullLabel,
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

function shouldReplaceGeneratedSalesOrderLineSpecification(
  line: Pick<
    SalesOrderLine,
    | 'specification'
    | 'productDisplayTitleSnapshot'
    | 'productDisplaySubtitleSnapshot'
    | 'productDisplayFullLabelSnapshot'
  >,
  derived: Pick<
    SalesOrderLineProductFields,
    | 'productDisplayTitleSnapshot'
    | 'productDisplaySubtitleSnapshot'
    | 'productDisplayFullLabelSnapshot'
  >
): boolean {
  const specification = normalizeLineValue(line.specification)
  const lineTitleSnapshot = normalizeLineValue(line.productDisplayTitleSnapshot)
  const derivedTitleSnapshot = normalizeLineValue(derived.productDisplayTitleSnapshot)
  if (shouldReplaceGeneratedSalesOrderLineValue(specification)) {
    return true
  }

  const generatedCandidates = [
    derivedTitleSnapshot,
    buildLegacySalesOrderLineDisplayFullLabel({
      title: derived.productDisplayTitleSnapshot,
      subtitle: derived.productDisplaySubtitleSnapshot,
    }),
    normalizeLineValue(derived.productDisplayFullLabelSnapshot),
  ]

  if (lineTitleSnapshot !== '' && lineTitleSnapshot === derivedTitleSnapshot) {
    generatedCandidates.push(
      lineTitleSnapshot,
      buildLegacySalesOrderLineDisplayFullLabel({
        title: line.productDisplayTitleSnapshot,
        subtitle: line.productDisplaySubtitleSnapshot,
      }),
      normalizeLineValue(line.productDisplayFullLabelSnapshot),
    )
  }

  return generatedCandidates.filter(Boolean).includes(specification)
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
      normalizeLineValue(displaySnapshot.productDisplayTitleSnapshot) ||
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
    specification: shouldReplaceGeneratedSalesOrderLineSpecification(line, derived)
      ? derived.specification
      : normalizeLineValue(line.specification),
    ...mergeSalesOrderLineDisplaySnapshot(line, displayProjection),
    modelCodeSnapshot:
      normalizeLineValue(line.modelCodeSnapshot) || derived.modelCodeSnapshot,
    holePrefixSnapshot:
      normalizeLineValue(line.holePrefixSnapshot) || derived.holePrefixSnapshot,
  }
}
