import { buildFlattenDelta } from '@/lib/delta/flatten-delta'
import { type DeltaSet } from '@/lib/delta/types'
import { normalizeComponentKey, normalizeMachineCode } from '@/lib/codecs/code-normalization'
import { type ProductTemplate } from '../data/schema'
import { type ProductTemplateApiDTO } from '../contracts/product-template-api-dto'
import { type SaveProductTemplateInput } from '../mutation-types'

export function toProductTemplateContract(dto: ProductTemplateApiDTO): ProductTemplate {
  return {
    id: dto.id,
    name: dto.name,
    code: normalizeMachineCode(dto.code),
    componentKey: normalizeComponentKey(dto.componentKey) as ProductTemplate['componentKey'],
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
    code: normalizeMachineCode(template.code),
    componentKey: normalizeComponentKey(template.componentKey) as ProductTemplateApiDTO['componentKey'],
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
    const fieldDelta = buildFlattenDelta(current[field], next[field], { basePath: String(field) })
    Object.assign(delta, fieldDelta)
  }
  return delta
}
