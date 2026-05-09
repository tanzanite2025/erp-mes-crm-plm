import { useMemo } from 'react'
import { type BOM } from '../data/schema'
import { type BOMItemDraft } from '../mutation-types'
import { createEmptyBOMFormValue } from '../utils/bom-form-defaults'
import { useBOMFormInitialization } from './use-bom-form-initialization'
import { useBOMFormOptions } from './use-bom-form-options'
import { useBOMFormState } from './use-bom-form-state'

interface UseBOMFormProps {
  currentRow?: BOM
  initialItems?: BOMItemDraft[]
  initialProductId?: string
  open: boolean
  isEdit: boolean
}

export function useBOMForm({ currentRow, initialItems, initialProductId, open, isEdit }: UseBOMFormProps) {
  const initialValues = useMemo<BOM>(() => createEmptyBOMFormValue(), [])
  const {
    form,
    fields,
    append,
    remove,
  } = useBOMFormState({
    initialValues,
  })

  const optionsResource = useBOMFormOptions({
    open,
  })
  const products = optionsResource.status === 'ready' ? optionsResource.products : []
  const materials = optionsResource.status === 'ready' ? optionsResource.materials : []
  const sections = optionsResource.status === 'ready' ? optionsResource.sections : []

  useBOMFormInitialization({
    form,
    currentRow,
    initialItems,
    initialProductId,
    sections,
    open,
    isEdit,
  })

  return {
    form,
    fields,
    append,
    remove,
    optionsResource,
    products,
    materials,
    sections,
  }
}
