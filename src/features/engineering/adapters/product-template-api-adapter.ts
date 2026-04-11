import { type DeltaSet } from '@/lib/delta/types'
import { type ProductTemplate } from '../data/schema'
import { type ProductTemplateApiDTO } from '../contracts/product-template-api-dto'
import { type SaveProductTemplateInput } from '../mutation-types'

export function toProductTemplateContract(dto: ProductTemplateApiDTO): ProductTemplate {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    componentKey: dto.componentKey,
    description: dto.description || '',
    active: dto.active,
    createdAt: dto.createdAt || new Date().toISOString(),
    version: dto._v ?? 1,
  }
}

export function toProductTemplateApiDTO(template: SaveProductTemplateInput): ProductTemplateApiDTO {
  return {
    id: template.id || '',
    name: template.name || '',
    code: template.code || '',
    componentKey: (template.componentKey || 'GENERAL') as ProductTemplateApiDTO['componentKey'],
    description: template.description || '',
    active: template.active ?? true,
    createdAt: template.createdAt,
    _v: template.version ?? 1,
  }
}

const PRODUCT_TEMPLATE_PATCH_FIELDS: Array<keyof ProductTemplate> = [
  'name',
  'code',
  'componentKey',
  'description',
  'active',
]

export function buildProductTemplateDelta(current: ProductTemplate, next: SaveProductTemplateInput): DeltaSet {
  const delta: DeltaSet = {}
  for (const field of PRODUCT_TEMPLATE_PATCH_FIELDS) {
    const currentValue = current[field] ?? null
    const nextValue = (next[field] ?? null) as ProductTemplate[typeof field] | null
    if (JSON.stringify(currentValue) === JSON.stringify(nextValue)) {
      continue
    }
    delta[field] = { o: currentValue, n: nextValue }
  }
  return delta
}
