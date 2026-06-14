import { buildFlattenDelta } from '@/lib/delta/flatten-delta'
import { type DeltaSet } from '@/lib/delta/types'
import { type ProductApiDTO } from '../contracts/product-api-dto'
import { type Product } from '../data/schema'
import { type SaveProductInput } from '../mutation-types'
import { toProductWriteApiDTO } from './product-write-adapter'

const PRODUCT_PATCH_FIELDS: Array<keyof ProductApiDTO> = [
  'sku',
  'name',
  'modelCode',
  'typeId',
  'depth',
  'widthInternal',
  'widthExternal',
  'maxTirePressure',
  'length',
  'angle',
  'clamp',
  'offset',
  'axleCrown',
  'steerer',
  'image',
  'restrictions',
  'moldGroup',
  'description',
  'engineeringSpecId',
  'bomId',
  'attributeValues',
  'techSpecs',
  'barcodeConfig',
  'attachments',
  'status',
  'revisionNo',
  'effectiveFrom',
  'effectiveTo',
  'changeType',
  'changeOrderNo',
  'siteCode',
  'isDefaultSite',
]

const PRODUCT_STRUCTURED_PATCH_FIELDS = new Set<keyof ProductApiDTO>([
  'restrictions',
  'attributeValues',
  'techSpecs',
  'barcodeConfig',
  'attachments',
])

function normalizeStructuredPatchValue(value: unknown) {
  return value === undefined ? null : value
}

function areStructuredPatchValuesEqual(
  currentValue: unknown,
  nextValue: unknown
): boolean {
  if (currentValue === nextValue) return true
  if (currentValue === null || nextValue === null)
    return currentValue === nextValue
  if (typeof currentValue !== typeof nextValue) return false

  try {
    return JSON.stringify(currentValue) === JSON.stringify(nextValue)
  } catch {
    return false
  }
}

function buildStructuredFieldDelta(
  field: keyof ProductApiDTO,
  currentValue: unknown,
  nextValue: unknown
): DeltaSet {
  const normalizedCurrentValue = normalizeStructuredPatchValue(currentValue)
  const normalizedNextValue = normalizeStructuredPatchValue(nextValue)

  if (
    areStructuredPatchValuesEqual(normalizedCurrentValue, normalizedNextValue)
  ) {
    return {}
  }

  return {
    [String(field)]: {
      o: normalizedCurrentValue,
      n: normalizedNextValue,
    },
  }
}

export function buildProductDelta(
  current: Product,
  next: SaveProductInput
): DeltaSet {
  const delta: DeltaSet = {}
  const currentDto = toProductWriteApiDTO(current)
  const nextDto = toProductWriteApiDTO(next)

  for (const field of PRODUCT_PATCH_FIELDS) {
    const fieldDelta = PRODUCT_STRUCTURED_PATCH_FIELDS.has(field)
      ? buildStructuredFieldDelta(field, currentDto[field], nextDto[field])
      : buildFlattenDelta(currentDto[field], nextDto[field], {
          basePath: String(field),
        })
    Object.assign(delta, fieldDelta)
  }

  return delta
}
