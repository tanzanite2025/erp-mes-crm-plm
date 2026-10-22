import {
  type ProductTemplate,
  type ProductTemplateAttributeLevelOneCategory,
  type ProductTemplateAttributeLevelTwoOption,
} from '../data/schema'

export function projectProductTemplateOwnedAttributesForProductDisplay(
  template: Pick<ProductTemplate, 'id' | 'attributeBindings'>
): {
  categories: ProductTemplateAttributeLevelOneCategory[]
  options: ProductTemplateAttributeLevelTwoOption[]
} {
  return {
    categories: template.attributeBindings.map((definition) => ({
      id: definition.id ?? definition.categoryKey,
      templateId: template.id,
      key: definition.categoryKey,
      nameZh: definition.nameZh,
      nameEn: definition.nameEn,
      description: definition.description,
      sortOrder: definition.sortOrder,
      active: definition.active,
      version: definition.version,
    })),
    options: template.attributeBindings.flatMap((definition) =>
      definition.options.map((option) => ({
        ...option,
        id: `${definition.categoryKey}:${option.value}`,
        templateId: template.id,
        categoryKey: definition.categoryKey,
        version: definition.version,
      }))
    ),
  }
}
