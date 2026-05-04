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

type ProductSubmitMode = 'single' | 'variant' | 'multi-variant' | 'edit'

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

interface VariantSelectionParams {
  selectedVariants: ProductVariantSelection[]
  level: string
}

interface ToggleVariantSelectionParams extends VariantSelectionParams {
  checked: boolean
  defaultWeight: number | undefined
}

interface UpdateVariantSelectionWeightParams extends VariantSelectionParams {
  weight: number | undefined
}

function toEditFormValues(currentRow: Product): Product {
  const draftRow: Product & { techSpecId?: string } = { ...currentRow }
  if (!draftRow.engineeringSpecId && draftRow.techSpecId) {
    draftRow.engineeringSpecId = draftRow.techSpecId
  }
  return draftRow
}

function getVersionLevelFromProduct(product: Product): string {
  return getAttributeValue(product, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version)
}

function createSelectedVariant(level: string, weight: number | undefined): ProductVariantSelection {
  return { level, weight }
}

function toEditSelectedVariants(formValues: Product): ProductVariantSelection[] {
  const versionLevel = getVersionLevelFromProduct(formValues)
  if (!versionLevel) return []
  return [createSelectedVariant(versionLevel, formValues.weight || 0)]
}

function toCreateSelectedVariants(
  formValues: Product,
  versionLevelOptions: OptionItem[]
): ProductVariantSelection[] {
  if (versionLevelOptions.length === 0) return []
  return [createSelectedVariant(versionLevelOptions[0].value, formValues.weight)]
}

function ensureVariantSelection(selectedVariants: ProductVariantSelection[], level: string, weight: number | undefined): ProductVariantSelection[] {
  const existing = selectedVariants.find((variant) => variant.level === level)
  if (existing) {
    return selectedVariants
  }

  return [...selectedVariants, createSelectedVariant(level, weight)]
}

function removeVariantSelection(selectedVariants: ProductVariantSelection[], level: string): ProductVariantSelection[] {
  return selectedVariants.filter((variant) => variant.level !== level)
}

function updateVariantWeight(selectedVariants: ProductVariantSelection[], level: string, weight: number | undefined): ProductVariantSelection[] {
  return selectedVariants.map((variant) =>
    variant.level === level ? createSelectedVariant(level, weight) : variant
  )
}

function toggleVariantSelection({
  selectedVariants,
  level,
  checked,
  defaultWeight,
}: ToggleVariantSelectionParams): ProductVariantSelection[] {
  return checked
    ? ensureVariantSelection(selectedVariants, level, defaultWeight)
    : removeVariantSelection(selectedVariants, level)
}

function updateVariantSelectionWeight({
  selectedVariants,
  level,
  weight,
}: UpdateVariantSelectionWeightParams): ProductVariantSelection[] {
  return updateVariantWeight(selectedVariants, level, weight)
}

function composeBatchSubmitPayload(
  values: Product,
  selectedVariants: ProductVariantSelection[],
  typeCode: string
): ProductSubmitPayload {
  return {
    mode: 'multi-variant',
    productsToSave: buildBatchProducts(values, selectedVariants, typeCode),
  }
}

function composeSingleVariantSubmitPayload(
  values: Product,
  selectedVariant: ProductVariantSelection,
  typeCode: string,
  isEdit: boolean
): ProductSubmitPayload {
  return {
    mode: isEdit ? 'edit' : 'variant',
    productsToSave: [buildSingleVariantProduct(values, selectedVariant, typeCode)],
  }
}

function composeDefaultSubmitPayload(values: Product, isEdit: boolean): ProductSubmitPayload {
  return {
    mode: isEdit ? 'edit' : 'single',
    productsToSave: [values],
  }
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
      return composeBatchSubmitPayload(values, selectedVariants, typeCode)
    }

    if (selectedVariants.length === 1) {
      return composeSingleVariantSubmitPayload(values, selectedVariants[0], typeCode, isEdit)
    }

    return composeDefaultSubmitPayload(values, isEdit)
  },

  selectVariant(params: ToggleVariantSelectionParams): ProductVariantSelection[] {
    return toggleVariantSelection(params)
  },

  deselectVariant(params: VariantSelectionParams): ProductVariantSelection[] {
    return removeVariantSelection(params.selectedVariants, params.level)
  },

  setVariantWeight(params: UpdateVariantSelectionWeightParams): ProductVariantSelection[] {
    return updateVariantSelectionWeight(params)
  },
}
