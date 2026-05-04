import {
  normalizeComponentKey,
  normalizeChangeOrderNo,
  normalizeBomNo,
  normalizeBomChangeType,
  normalizeEngineeringDateProtocol,
  normalizeBomStatus,
  normalizeBomVersion,
  normalizeMachineCode,
  normalizeModelCode,
  normalizeRevisionNo,
  normalizeSiteCode,
  normalizeSku,
  normalizeTemplateKey,
} from '@/lib/codecs/code-normalization'
import { type ProductTemplate, type ProductType } from '../data/schema'
import {
  type SaveProductInput,
  type SaveProductTemplateInput,
  type SaveProductTypeInput,
  type SaveBOMInput,
} from '../mutation-types'
import { normalizeProductAttributeMachineValue } from './product-attribute-machine-value'

export function normalizeEngineeringTemplateCode(value?: string | null): string {
  return normalizeMachineCode(value)
}

export function normalizeEngineeringTemplateComponentKey(
  value?: string | null
): ProductTemplate['componentKey'] {
  return normalizeComponentKey(value) as ProductTemplate['componentKey']
}

export function normalizeProductTemplateInput(
  template: SaveProductTemplateInput
): SaveProductTemplateInput {
  if (!template.attributeBindings) throw new Error('[CRITICAL] attributeBindings missing in SaveProductTemplateInput')

  return {
    ...template,
    code: normalizeEngineeringTemplateCode(template.code),
    componentKey: normalizeEngineeringTemplateComponentKey(template.componentKey),
    attributeBindings: template.attributeBindings.map((binding, index) => ({
      ...binding,
      templateId: binding.templateId?.trim() || template.id || undefined,
      categoryKey: binding.categoryKey?.trim() || '',
      sortOrder: binding.sortOrder ?? index + 1,
      required: Boolean(binding.required),
      active: binding.active ?? true,
      version: binding.version ?? 1,
    })),
  }
}

export function normalizeProductTemplateEntity(template: ProductTemplate): ProductTemplate {
  if (!template.attributeBindings) throw new Error('[CRITICAL] attributeBindings missing in ProductTemplate entity')

  return {
    ...template,
    code: normalizeEngineeringTemplateCode(template.code),
    componentKey: normalizeEngineeringTemplateComponentKey(template.componentKey),
    attributeBindings: template.attributeBindings.map((binding, index) => ({
      ...binding,
      templateId: binding.templateId?.trim() || template.id || undefined,
      categoryKey: binding.categoryKey?.trim() || '',
      sortOrder: binding.sortOrder ?? index + 1,
      required: Boolean(binding.required),
      active: binding.active ?? true,
      version: binding.version ?? 1,
    })),
  }
}

export function normalizeEngineeringProductTypeCode(value?: string | null): string {
  return normalizeMachineCode(value)
}

export function normalizeProductTypeInput(type: SaveProductTypeInput): SaveProductTypeInput {
  return {
    ...type,
    code: normalizeEngineeringProductTypeCode(type.code),
  }
}

export function normalizeProductTypeEntity(type: ProductType): ProductType {
  return {
    ...type,
    code: normalizeEngineeringProductTypeCode(type.code),
  }
}

export function normalizeProductSkuValue(value?: string | null): string {
  return normalizeSku(value)
}

export function normalizeProductModelCodeValue(value?: string | null, fallback = '01'): string {
  return normalizeModelCode(value, fallback)
}

export function normalizeProductTemplateKeyValue(value?: string | null): string {
  return normalizeTemplateKey(value)
}

export function deriveNormalizedProductSku(
  typeCode: string,
  modelCode: string,
  versionLevel?: string
): string {
  const normalizedTypeCode = normalizeProductSkuValue(typeCode)
  const normalizedModelCode = normalizeProductModelCodeValue(modelCode)
  const normalizedVersionLevel = normalizeProductSkuValue(versionLevel)

  if (versionLevel) {
    return normalizeProductSkuValue(`${normalizedTypeCode}-${normalizedModelCode}-${normalizedVersionLevel}`)
  }

  return normalizeProductSkuValue(`${normalizedTypeCode}-${normalizedModelCode}`)
}

export function normalizeSaveProductInput(product: SaveProductInput): SaveProductInput {
  if (!product.attributeValues) throw new Error('[CRITICAL] attributeValues missing in SaveProductInput')

  return {
    ...product,
    sku: normalizeProductSkuValue(product.sku),
    modelCode: normalizeProductModelCodeValue(product.modelCode),
    templateKey: normalizeProductTemplateKeyValue(product.templateKey),
    attributeValues: product.attributeValues.map((item) => ({
      ...item,
      categoryKey: item.categoryKey?.trim() || '',
      optionValue: normalizeProductAttributeMachineValue(item.optionValue),
    })),
    revisionNo: normalizeEngineeringRevisionNo(product.revisionNo),
    changeOrderNo: normalizeEngineeringChangeOrderNo(product.changeOrderNo),
    siteCode: normalizeEngineeringSiteCode(product.siteCode),
  }
}

export function normalizeEngineeringRevisionNo(value?: string | null, fallback = 'R1'): string {
  return normalizeRevisionNo(value, fallback)
}

export function normalizeEngineeringSiteCode(value?: string | null): string {
  return normalizeSiteCode(value)
}

export function normalizeEngineeringChangeOrderNo(value?: string | null): string {
  return normalizeChangeOrderNo(value)
}

export function normalizeEngineeringBomNo(value?: string | null): string {
  return normalizeBomNo(value)
}

export function normalizeEngineeringBomVersion(value?: string | null, fallback = 'V1.0'): string {
  return normalizeBomVersion(value, fallback)
}

export function normalizeEngineeringBomChangeType(
  value?: string | null,
  fallback: 'MANUAL' | 'ECO' | 'ECN' = 'MANUAL'
): 'MANUAL' | 'ECO' | 'ECN' {
  return normalizeBomChangeType(value, fallback)
}

export function normalizeEngineeringBomStatus(
  value?: string | null,
  fallback: 'draft' | 'active' | 'archived' = 'active'
): 'draft' | 'active' | 'archived' {
  return normalizeBomStatus(value, fallback)
}

export function normalizeEngineeringBomEffectiveDate(value?: string | null): string {
  return normalizeEngineeringDateProtocol(value)
}

export function normalizeBOMControlFieldPatch<T extends {
  changeType?: string | null
  status?: string | null
  revisionNo?: string | null
  siteCode?: string | null
  effectiveFrom?: string | null
  effectiveTo?: string | null
  isDefaultSite?: boolean | null
}>(data: T): T {
  const normalized = { ...data } as T

  if ('changeType' in data) {
    normalized.changeType = normalizeEngineeringBomChangeType(data.changeType) as T['changeType']
  }
  if ('status' in data) {
    normalized.status = normalizeEngineeringBomStatus(data.status) as T['status']
  }
  if ('revisionNo' in data) {
    normalized.revisionNo = normalizeEngineeringRevisionNo(data.revisionNo) as T['revisionNo']
  }
  if ('effectiveFrom' in data) {
    normalized.effectiveFrom = (normalizeEngineeringBomEffectiveDate(data.effectiveFrom) || '') as T['effectiveFrom']
  }
  if ('effectiveTo' in data) {
    normalized.effectiveTo = (normalizeEngineeringBomEffectiveDate(data.effectiveTo) || '') as T['effectiveTo']
  }
  if ('siteCode' in data) {
    const normalizedSiteCode = normalizeEngineeringSiteCode(data.siteCode)
    normalized.siteCode = normalizedSiteCode as T['siteCode']
    normalized.isDefaultSite = (data.isDefaultSite ?? !normalizedSiteCode) as T['isDefaultSite']
  }

  return normalized
}

export function normalizeBOMInput(data: SaveBOMInput): SaveBOMInput {
  const normalizedSiteCode = normalizeEngineeringSiteCode(data.siteCode)

  return {
    ...data,
    bomNo: normalizeEngineeringBomNo(data.bomNo),
    bomVersion: normalizeEngineeringBomVersion(data.bomVersion),
    changeType: normalizeEngineeringBomChangeType(data.changeType),
    status: normalizeEngineeringBomStatus(data.status),
    siteCode: normalizedSiteCode,
    revisionNo: normalizeEngineeringRevisionNo(data.revisionNo),
    effectiveFrom: normalizeEngineeringBomEffectiveDate(data.effectiveFrom) || undefined,
    effectiveTo: normalizeEngineeringBomEffectiveDate(data.effectiveTo) || undefined,
    isDefaultSite: normalizedSiteCode === '' || Boolean(data.isDefaultSite),
  }
}
