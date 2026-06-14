import {
  normalizeComponentKey,
  normalizeChangeOrderNo,
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
} from '../mutation-types'
import { normalizeProductAttributeMachineValue } from './product-attribute-machine-value'

export function normalizeEngineeringTemplateCode(
  value?: string | null
): string {
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
  if (!template.attributeBindings)
    throw new Error(
      '[CRITICAL] attributeBindings missing in SaveProductTemplateInput'
    )

  return {
    ...template,
    code: normalizeEngineeringTemplateCode(template.code),
    componentKey: normalizeEngineeringTemplateComponentKey(
      template.componentKey
    ),
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

export function normalizeProductTemplateEntity(
  template: ProductTemplate
): ProductTemplate {
  if (!template.attributeBindings)
    throw new Error(
      '[CRITICAL] attributeBindings missing in ProductTemplate entity'
    )

  return {
    ...template,
    code: normalizeEngineeringTemplateCode(template.code),
    componentKey: normalizeEngineeringTemplateComponentKey(
      template.componentKey
    ),
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

export function normalizeEngineeringProductTypeCode(
  value?: string | null
): string {
  return normalizeMachineCode(value)
}

export function normalizeProductTypeInput(
  type: SaveProductTypeInput
): SaveProductTypeInput {
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

export function normalizeProductModelCodeValue(
  value?: string | null,
  fallback = '01'
): string {
  return normalizeModelCode(value, fallback)
}

export function normalizeProductTemplateKeyValue(
  value?: string | null
): string {
  return normalizeTemplateKey(value)
}

export function deriveNormalizedProductSku(
  typeCode: string,
  modelCode: string
): string {
  // 思路 3 重构 (Step R7): SKU 公式简化为 typeCode-modelCode,
  // versionLevel 已迁移到 BOM,不参与 SKU 派生。
  const normalizedTypeCode = normalizeProductSkuValue(typeCode)
  const normalizedModelCode = normalizeProductModelCodeValue(modelCode)

  return normalizeProductSkuValue(
    `${normalizedTypeCode}-${normalizedModelCode}`
  )
}

export function normalizeSaveProductInput(
  product: SaveProductInput
): SaveProductInput {
  if (!product.attributeValues)
    throw new Error('[CRITICAL] attributeValues missing in SaveProductInput')

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
    masterDataControl: product.masterDataControl
      ? {
          ...product.masterDataControl,
          revisionNo: normalizeEngineeringRevisionNo(
            product.masterDataControl.revisionNo
          ),
          changeOrderNo: normalizeEngineeringChangeOrderNo(
            product.masterDataControl.changeOrderNo
          ),
          siteCode: normalizeEngineeringSiteCode(
            product.masterDataControl.siteCode
          ),
        }
      : undefined,
  }
}

export function normalizeEngineeringRevisionNo(
  value?: string | null,
  fallback = 'R1'
): string {
  return normalizeRevisionNo(value, fallback)
}

export function normalizeEngineeringSiteCode(value?: string | null): string {
  return normalizeSiteCode(value)
}

export function normalizeEngineeringChangeOrderNo(
  value?: string | null
): string {
  return normalizeChangeOrderNo(value)
}
