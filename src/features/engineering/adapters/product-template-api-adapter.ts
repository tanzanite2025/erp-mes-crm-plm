import { buildFlattenDelta } from '@/lib/delta/flatten-delta'
import { type DeltaSet } from '@/lib/delta/types'
import { type ProductTemplate, type ProductTemplateAttributeBinding } from '../data/schema'
import { type ProductTemplateApiDTO, type ProductTemplateAttributeBindingApiDTO } from '../contracts/product-template-api-dto'
import { type SaveProductTemplateInput } from '../mutation-types'
import {
  normalizeEngineeringTemplateCode,
  normalizeEngineeringTemplateComponentKey,
} from '../utils/product-code-normalization'

function toProductTemplateAttributeBindingContract(
  dto: ProductTemplateAttributeBindingApiDTO
): ProductTemplateAttributeBinding {
  return {
    id: dto.id,
    templateId: dto.templateId,
    categoryKey: dto.categoryKey,
    sortOrder: dto.sortOrder ?? 0,
    required: dto.required ?? false,
    active: dto.active ?? true,
    version: dto.version ?? 1,
  }
}

function toProductTemplateAttributeBindingApiDTO(
  binding: ProductTemplateAttributeBinding
): ProductTemplateAttributeBindingApiDTO {
  return {
    id: binding.id,
    templateId: binding.templateId,
    categoryKey: binding.categoryKey,
    sortOrder: binding.sortOrder ?? 0,
    required: binding.required ?? false,
    active: binding.active ?? true,
    version: binding.version ?? 1,
  }
}

export function toProductTemplateContract(dto: ProductTemplateApiDTO): ProductTemplate {
  if (!dto.attributeBindings) throw new Error('[CRITICAL] Missing attributeBindings array in ProductTemplate DTO')

  return {
    id: dto.id,
    name: dto.name,
    code: normalizeEngineeringTemplateCode(dto.code),
    componentKey: normalizeEngineeringTemplateComponentKey(dto.componentKey),
    description: dto.description || '',
    active: dto.active,
    attributeBindings: dto.attributeBindings.map(toProductTemplateAttributeBindingContract),
    createdAt: dto.createdAt || new Date().toISOString(),
    version: dto.version ?? 1,
  }
}

type ProductTemplateWriteCandidate = Omit<ProductTemplateApiDTO, 'version'> & {
  version: number
}

function toProductTemplateWriteCandidate(template: SaveProductTemplateInput): ProductTemplateWriteCandidate {
  if (!template.attributeBindings) throw new Error('[CRITICAL] attributeBindings missing during save')

  return {
    id: template.id || '',
    name: template.name || '',
    code: normalizeEngineeringTemplateCode(template.code),
    componentKey: normalizeEngineeringTemplateComponentKey(template.componentKey),
    description: template.description || '',
    active: template.active ?? true,
    attributeBindings: template.attributeBindings.map(toProductTemplateAttributeBindingApiDTO),
    createdAt: template.createdAt,
    version: template.version ?? 1,
  }
}

function toProductTemplateWriteApiDTO(candidate: ProductTemplateWriteCandidate): ProductTemplateApiDTO {
  return candidate as ProductTemplateApiDTO
}

export function toProductTemplateApiDTO(template: SaveProductTemplateInput): ProductTemplateApiDTO {
  return toProductTemplateWriteApiDTO(toProductTemplateWriteCandidate(template))
}

const PRODUCT_TEMPLATE_PATCH_FIELDS: Array<keyof ProductTemplate> = [
  'name',
  'code',
  'componentKey',
  'description',
  'active',
  'attributeBindings',
]

export function buildProductTemplateDelta(current: ProductTemplate, next: SaveProductTemplateInput): DeltaSet {
  const delta: DeltaSet = {}
  for (const field of PRODUCT_TEMPLATE_PATCH_FIELDS) {
    const fieldDelta = buildFlattenDelta(current[field], next[field], { basePath: String(field) })
    Object.assign(delta, fieldDelta)
  }
  return delta
}
