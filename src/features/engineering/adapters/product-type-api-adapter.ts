import { type DeltaSet } from '@/lib/delta/types'
import { type ProductType } from '../data/schema'
import { type ProductTypeApiDTO, type ProductTypeListPageApiDTO } from '../contracts/product-type-api-dto'
import { type SaveProductTypeInput } from '../mutation-types'

export function toProductTypeContract(dto: ProductTypeApiDTO): ProductType {
  return {
    id: dto.id,
    parentId: dto.parentId || undefined,
    templateId: dto.templateId || undefined,
    name: dto.name,
    code: dto.code,
    description: dto.description || undefined,
    active: dto.active,
    sortOrder: dto.sortOrder ?? 0,
    createdAt: dto.createdAt || undefined,
    updatedAt: dto.updatedAt || undefined,
    version: dto._v ?? 1,
  }
}

function collectProductTypes(items: ProductTypeApiDTO[], bucket: Map<string, ProductType>) {
  for (const item of items) {
    if (!bucket.has(item.id)) {
      bucket.set(item.id, toProductTypeContract(item))
    }
    if (item.children?.length) {
      collectProductTypes(item.children, bucket)
    }
  }
}

export function toProductTypeArrayContract(items: ProductTypeApiDTO[]): ProductType[] {
  const bucket = new Map<string, ProductType>()
  collectProductTypes(items, bucket)
  return Array.from(bucket.values())
}

export function toProductTypeListContract(dto: ProductTypeListPageApiDTO): ProductType[] {
  return toProductTypeArrayContract(dto.items)
}

export function toProductTypeApiDTO(type: SaveProductTypeInput): ProductTypeApiDTO {
  return {
    id: type.id || '',
    parentId: type.parentId ?? null,
    templateId: type.templateId ?? null,
    name: type.name || '',
    code: type.code || '',
    description: type.description || '',
    active: type.active ?? true,
    sortOrder: type.sortOrder ?? 0,
    createdAt: type.createdAt,
    updatedAt: type.updatedAt,
    _v: type.version ?? 1,
  }
}

const PRODUCT_TYPE_PATCH_FIELDS: Array<keyof ProductType> = [
  'parentId',
  'templateId',
  'name',
  'code',
  'description',
  'active',
  'sortOrder',
]

export function buildProductTypeDelta(current: ProductType, next: SaveProductTypeInput): DeltaSet {
  const delta: DeltaSet = {}

  for (const field of PRODUCT_TYPE_PATCH_FIELDS) {
    const currentValue = current[field] ?? null
    const nextValue = (next[field] ?? null) as ProductType[typeof field] | null
    if (JSON.stringify(currentValue) === JSON.stringify(nextValue)) {
      continue
    }
    delta[field] = { o: currentValue, n: nextValue }
  }

  return delta
}
