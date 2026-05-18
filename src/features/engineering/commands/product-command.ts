import { type Product } from '../data/schema'
import { buildDefaultProductValues } from '../utils/product-form-utils'

interface ComposeInitialStateParams {
  isEdit: boolean
  currentRow?: Product
  baseValues?: Product
}

interface ProductInitialState {
  formValues: Product
}

type ProductSubmitMode = 'single' | 'edit'

interface ComposeSubmitPayloadParams {
  values: Product
  typeCode: string
  isEdit: boolean
}

interface ProductSubmitPayload {
  mode: ProductSubmitMode
  productsToSave: Product[]
}

function toEditFormValues(currentRow: Product): Product {
  const draftRow: Product & { techSpecId?: string } = { ...currentRow }
  if (!draftRow.engineeringSpecId && draftRow.techSpecId) {
    draftRow.engineeringSpecId = draftRow.techSpecId
  }
  draftRow.name = ''
  draftRow.sku = ''
  return draftRow
}

export const ProductCommand = {
  composeInitialState({
    isEdit,
    currentRow,
    baseValues,
  }: ComposeInitialStateParams): ProductInitialState {
    if (isEdit && currentRow) {
      return {
        formValues: toEditFormValues(currentRow),
      }
    }

    return {
      formValues: baseValues ?? buildDefaultProductValues({ includeVersion: false }),
    }
  },

  composeSubmitPayload({
    values,
    isEdit,
  }: ComposeSubmitPayloadParams): ProductSubmitPayload {
    return {
      mode: isEdit ? 'edit' : 'single',
      productsToSave: [values],
    }
  },
}
