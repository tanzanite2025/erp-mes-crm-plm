import { type Product } from '../data/schema'
import { PRODUCT_ATTRIBUTE_CATEGORY_KEYS, getAttributeValue } from '../utils/product-attribute-utils'
import {
  buildBatchProducts,
  buildDefaultProductValues,
  buildSingleVariantProduct,
  type ProductVariantSelection,
} from '../utils/product-form-utils'

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

type ProductSubmitMode = 'single' | 'variant' | 'batch' | 'edit'

interface ComposeSubmitPayloadParams {
  values: Product
  selectedVariants: ProductVariantSelection[]
  typeCode: string
  isEdit: boolean
}

interface ProductSubmitPayload {
  mode: ProductSubmitMode
  productsToSave: Product[]
}

interface ToggleVariantSelectionParams {
  selectedVariants: ProductVariantSelection[]
  level: string
  checked: boolean
  defaultWeight: number | undefined
}

interface UpdateVariantSelectionWeightParams {
  selectedVariants: ProductVariantSelection[]
  level: string
  weight: number | undefined
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

function toggleVariantSelection({
  selectedVariants,
  level,
  checked,
  defaultWeight,
}: ToggleVariantSelectionParams): ProductVariantSelection[] {
  if (checked) {
    if (selectedVariants.some((variant) => variant.level === level)) {
      return selectedVariants
    }

    return [...selectedVariants, { level, weight: defaultWeight }]
  }

  return selectedVariants.filter((variant) => variant.level !== level)
}

function updateVariantSelectionWeight({
  selectedVariants,
  level,
  weight,
}: UpdateVariantSelectionWeightParams): ProductVariantSelection[] {
  return selectedVariants.map((variant) =>
    variant.level === level ? { ...variant, weight } : variant
  )
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

  composeSubmitPayload({
    values,
    selectedVariants,
    typeCode,
    isEdit,
  }: ComposeSubmitPayloadParams): ProductSubmitPayload {
    if (selectedVariants.length > 1) {
      return {
        mode: 'batch',
        productsToSave: buildBatchProducts(values, selectedVariants, typeCode),
      }
    }

    if (selectedVariants.length === 1) {
      return {
        mode: isEdit ? 'edit' : 'variant',
        productsToSave: [buildSingleVariantProduct(values, selectedVariants[0], typeCode)],
      }
    }

    return {
      mode: isEdit ? 'edit' : 'single',
      productsToSave: [values],
    }
  },

  toggleVariantSelection(params: ToggleVariantSelectionParams): ProductVariantSelection[] {
    return toggleVariantSelection(params)
  },

  updateVariantSelectionWeight(params: UpdateVariantSelectionWeightParams): ProductVariantSelection[] {
    return updateVariantSelectionWeight(params)
  },
}
