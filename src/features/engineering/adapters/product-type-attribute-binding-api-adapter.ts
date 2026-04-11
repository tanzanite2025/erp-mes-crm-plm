import { type DeltaSet } from '@/lib/delta/types'
import { type ProductTypeAttributeBinding } from '../data/schema'
import { type ProductTypeAttributeBindingApiDTO } from '../contracts/product-type-attribute-binding-api-dto'
import { type SaveProductTypeAttributeBindingInput } from '../mutation-types'

export function toProductTypeAttributeBindingContract(
  dto: ProductTypeAttributeBindingApiDTO
): ProductTypeAttributeBinding {
  return {
    id: dto.id,
    productTypeId: dto.productTypeId,
    categoryKey: dto.categoryKey,
    sortOrder: dto.sortOrder ?? 0,
    required: dto.required ?? false,
    active: dto.active ?? true,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    version: dto.version ?? 1,
  }
}

export function toProductTypeAttributeBindingApiDTO(
  binding: SaveProductTypeAttributeBindingInput
): ProductTypeAttributeBindingApiDTO {
  return {
    id: binding.id || '',
    productTypeId: binding.productTypeId || '',
    categoryKey: binding.categoryKey || '',
    sortOrder: binding.sortOrder ?? 0,
    required: binding.required ?? false,
    active: binding.active ?? true,
    createdAt: binding.createdAt,
    updatedAt: binding.updatedAt,
    version: binding.version ?? 1,
  }
}

const PRODUCT_TYPE_ATTRIBUTE_BINDING_PATCH_FIELDS: Array<keyof ProductTypeAttributeBinding> = [
  'productTypeId',
  'categoryKey',
  'sortOrder',
  'required',
  'active',
]

export function buildProductTypeAttributeBindingDelta(
  current: ProductTypeAttributeBinding,
  next: SaveProductTypeAttributeBindingInput
): DeltaSet {
  const delta: DeltaSet = {}
  for (const field of PRODUCT_TYPE_ATTRIBUTE_BINDING_PATCH_FIELDS) {
    const currentValue = current[field] ?? null
    const nextValue = (next[field] ?? null) as ProductTypeAttributeBinding[typeof field] | null
    if (JSON.stringify(currentValue) === JSON.stringify(nextValue)) {
      continue
    }
    delta[field] = { o: currentValue, n: nextValue }
  }
  return delta
}
