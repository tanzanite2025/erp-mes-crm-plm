import {
  normalizeComponentKey,
  normalizeChangeOrderNo,
  normalizeBomNo,
  normalizeBomChangeType,
  normalizeBomEffectiveDate,
  normalizeBomStatus,
  normalizeBomVersion,
  normalizeMachineCode,
  normalizeModelCode,
  normalizeRevisionNo,
  normalizeSiteCode,
  normalizeSku,
  normalizeTemplateKey,
} from '@/lib/codecs/code-normalization'
import { type ChangeOrder, type ProductProcessRouting, type ProductTemplate, type ProductType } from '../data/schema'
import {
  type SaveChangeOrderInput,
  type SaveProductInput,
  type SaveProductTemplateInput,
  type SaveProductTypeInput,
  type SaveBOMInput,
} from '../mutation-types'

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
  return {
    ...template,
    code: normalizeEngineeringTemplateCode(template.code),
    componentKey: normalizeEngineeringTemplateComponentKey(template.componentKey),
  }
}

export function normalizeProductTemplateEntity(template: ProductTemplate): ProductTemplate {
  return {
    ...template,
    code: normalizeEngineeringTemplateCode(template.code),
    componentKey: normalizeEngineeringTemplateComponentKey(template.componentKey),
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
  return {
    ...product,
    sku: normalizeProductSkuValue(product.sku),
    modelCode: normalizeProductModelCodeValue(product.modelCode),
    templateKey: normalizeProductTemplateKeyValue(product.templateKey),
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

export function normalizeChangeOrderInput(changeOrder: SaveChangeOrderInput): SaveChangeOrderInput {
  const normalizedSiteCode = normalizeEngineeringSiteCode(changeOrder.siteCode)

  return {
    ...changeOrder,
    changeOrderNo: normalizeEngineeringChangeOrderNo(changeOrder.changeOrderNo),
    siteCode: normalizedSiteCode,
    revisionNo: normalizeEngineeringRevisionNo(changeOrder.revisionNo),
    isDefaultSite: normalizedSiteCode === '' || Boolean(changeOrder.isDefaultSite),
  }
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
  return normalizeBomEffectiveDate(value)
}

export function normalizeEngineeringRoutingVersionControlTag(
  value?: string | null,
  fallback = 'V1.0.0.Draft'
): string {
  return normalizeBomVersion(value, fallback)
}

export function normalizeProductRoutingEntity(
  routing: ProductProcessRouting
): ProductProcessRouting {
  return {
    ...routing,
    versionControlTag: normalizeEngineeringRoutingVersionControlTag(routing.versionControlTag),
    isCurrentlyActiveBlueprint: Boolean(routing.isCurrentlyActiveBlueprint),
  }
}

export function normalizeBOMInput(data: SaveBOMInput): SaveBOMInput {
  const normalizedSiteCode = normalizeEngineeringSiteCode(data.siteCode)

  return {
    ...data,
    bomNo: normalizeEngineeringBomNo(data.bomNo),
    bomVersion: normalizeEngineeringBomVersion(data.bomVersion),
    changeType: normalizeEngineeringBomChangeType(data.changeType),
    status: normalizeEngineeringBomStatus(data.status),
    changeOrderNo: normalizeEngineeringChangeOrderNo(data.changeOrderNo),
    siteCode: normalizedSiteCode,
    revisionNo: normalizeEngineeringRevisionNo(data.revisionNo),
    effectiveFrom: normalizeEngineeringBomEffectiveDate(data.effectiveFrom) || undefined,
    effectiveTo: normalizeEngineeringBomEffectiveDate(data.effectiveTo) || undefined,
    isDefaultSite: normalizedSiteCode === '' || Boolean(data.isDefaultSite),
  }
}

export function normalizeChangeOrderEntity(changeOrder: ChangeOrder): ChangeOrder {
  const normalizedSiteCode = normalizeEngineeringSiteCode(changeOrder.siteCode)

  return {
    ...changeOrder,
    changeOrderNo: normalizeEngineeringChangeOrderNo(changeOrder.changeOrderNo),
    siteCode: normalizedSiteCode,
    revisionNo: normalizeEngineeringRevisionNo(changeOrder.revisionNo),
    isDefaultSite: normalizedSiteCode === '' || Boolean(changeOrder.isDefaultSite),
  }
}
