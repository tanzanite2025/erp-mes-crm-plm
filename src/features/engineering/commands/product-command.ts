import { type Product } from '../data/schema'
import { PRODUCT_ATTRIBUTE_CATEGORY_KEYS, getAttributeValue } from '../utils/product-attribute-utils'
import { buildDefaultProductValues, type ProductVariantSelection } from '../utils/product-form-utils'

interface OptionItem {
  label: string
  value: string
}

interface ComposeInitialStateParams {
  isEdit: boolean
  currentRow?: Product
  versionLevelOptions?: OptionItem[]
  baseValues?: Product
}

interface ProductInitialState {
  formValues: Product
  selectedVariants: ProductVariantSelection[]
}

function toEditFormValues(currentRow: Product): Product {
  const draftRow: Product & { techSpecId?: string } = { ...currentRow }
  if (!draftRow.engineeringSpecId && draftRow.techSpecId) {
    draftRow.engineeringSpecId = draftRow.techSpecId
  }
  return draftRow
}

function toEditSelectedVariants(formValues: Product): ProductVariantSelection[] {
  const versionLevel = getAttributeValue(formValues, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version)
  if (!versionLevel) return []
  return [{ level: versionLevel, weight: formValues.weight || 0 }]
}

function toCreateSelectedVariants(
  formValues: Product,
  versionLevelOptions: OptionItem[]
): ProductVariantSelection[] {
  if (versionLevelOptions.length === 0) return []
  return [{ level: versionLevelOptions[0].value, weight: formValues.weight }]
}

export const ProductCommand = {
  composeInitialState({
    isEdit,
    currentRow,
    versionLevelOptions = [],
    baseValues,
  }: ComposeInitialStateParams): ProductInitialState {
    if (isEdit && currentRow) {
      const formValues = toEditFormValues(currentRow)
      return {
        formValues,
        selectedVariants: toEditSelectedVariants(formValues),
      }
    }

    const formValues = baseValues ?? buildDefaultProductValues({ includeVersion: false })
    return {
      formValues,
      selectedVariants: toCreateSelectedVariants(formValues, versionLevelOptions),
    }
  },
}
