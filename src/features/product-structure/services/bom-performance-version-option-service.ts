import { type ProductTemplateAttributeLevelTwoOption } from '@/features/engineering/data/schema'
import { type SaveProductTemplateAttributeLevelTwoOptionInput } from '@/features/engineering/mutation-types'
import { ProductAttributeOptionService } from '@/features/engineering/services/product-attribute-option-service'
import { areSameProductAttributeCategoryKey } from '@/features/engineering/utils/product-attribute-machine-value'

export const BOM_PERFORMANCE_VERSION_CATEGORY_KEY = 'versionLevel'

export type BOMPerformanceVersionOption = ProductTemplateAttributeLevelTwoOption
export type SaveBOMPerformanceVersionOptionInput = Omit<
  SaveProductTemplateAttributeLevelTwoOptionInput,
  'categoryKey'
>

function validateIndependentBOMPerformanceVersionOption(
  option: BOMPerformanceVersionOption
): void {
  if (
    option.templateId ||
    !areSameProductAttributeCategoryKey(
      option.categoryKey,
      BOM_PERFORMANCE_VERSION_CATEGORY_KEY
    )
  ) {
    throw new Error('该记录不属于 BOM 性能版本选项')
  }
}

// Reuse the existing persistence contract while keeping this catalog independent
// of product template categories, their forms and their queries.
export const BOMPerformanceVersionOptionService = {
  async listPerformanceVersionOptions(): Promise<
    BOMPerformanceVersionOption[]
  > {
    const options =
      await ProductAttributeOptionService.getProductAttributeOptions({
        categoryKey: BOM_PERFORMANCE_VERSION_CATEGORY_KEY,
      })
    return options.filter(
      (option) =>
        !option.templateId &&
        areSameProductAttributeCategoryKey(
          option.categoryKey,
          BOM_PERFORMANCE_VERSION_CATEGORY_KEY
        )
    )
  },

  async savePerformanceVersionOption(
    input: SaveBOMPerformanceVersionOptionInput,
    current?: BOMPerformanceVersionOption
  ): Promise<BOMPerformanceVersionOption> {
    if (current) validateIndependentBOMPerformanceVersionOption(current)
    return ProductAttributeOptionService.saveProductAttributeOption(
      { ...input, categoryKey: BOM_PERFORMANCE_VERSION_CATEGORY_KEY },
      current
    )
  },

  async deletePerformanceVersionOption(
    option: BOMPerformanceVersionOption
  ): Promise<void> {
    validateIndependentBOMPerformanceVersionOption(option)
    await ProductAttributeOptionService.deleteProductAttributeOption(option.id)
  },
}
