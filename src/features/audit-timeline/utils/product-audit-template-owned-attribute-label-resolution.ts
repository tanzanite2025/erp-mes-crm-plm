import {
  type Product,
  type ProductTemplate,
  type ProductType,
} from '@/features/engineering/data/schema'
import { normalizeProductAttributeMachineValue } from '@/features/engineering/utils/product-attribute-machine-value'
import { projectProductTemplateOwnedAttributesForProductDisplay } from '@/features/engineering/utils/product-template-owned-attribute-catalog-projection'
import {
  resolveAuthoritativeTemplateForProduct,
  resolveTemplateFromTypeChain,
} from '@/features/engineering/utils/product-template-resolution'
import { type AuditLog } from '../types'

export function resolveProductAuditTemplateOwnedAttributeLabelCatalog(params: {
  log: Pick<AuditLog, 'diff'>
  side: 'o' | 'n'
  product?: Product
  templates: ProductTemplate[]
  productTypes: ProductType[]
}) {
  const recordedChanges = Array.isArray(params.log.diff) ? params.log.diff : []
  const findRecordedProductAuditFieldChange = (field: string) =>
    recordedChanges.find(
      (item) =>
        item.f
          .trim()
          .replace(/[\s_-]/g, '')
          .toLowerCase() === field
    )
  const recordedTemplate =
    findRecordedProductAuditFieldChange('resolvedtemplateid')
  const recordedType = findRecordedProductAuditFieldChange('typeid')
  const readRecordedProductAuditFieldValue = (item: typeof recordedType) =>
    typeof item?.[params.side] === 'string'
      ? (item[params.side] as string).trim()
      : ''
  let template: ProductTemplate | null | undefined
  if (recordedTemplate) {
    template = params.templates.find(
      (item) => item.id === readRecordedProductAuditFieldValue(recordedTemplate)
    )
  } else if (recordedType) {
    const templateId = resolveTemplateFromTypeChain(
      params.productTypes,
      readRecordedProductAuditFieldValue(recordedType)
    )?.templateId
    template = params.templates.find((item) => item.id === templateId)
  } else if (params.product) {
    template = resolveAuthoritativeTemplateForProduct(
      params.templates,
      params.product,
      params.productTypes
    ).template
  }
  const catalog = template
    ? projectProductTemplateOwnedAttributesForProductDisplay(template)
    : { categories: [], options: [] }
  return {
    categoriesByKey: new Map(
      catalog.categories.map((category) => [
        normalizeProductAttributeMachineValue(category.key),
        category,
      ])
    ),
    optionsByCategoryAndValue: new Map(
      catalog.options.map((option) => [
        `${normalizeProductAttributeMachineValue(option.categoryKey)}::${normalizeProductAttributeMachineValue(option.value)}`,
        option,
      ])
    ),
  }
}
