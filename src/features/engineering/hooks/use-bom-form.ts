import { useMemo } from 'react'
import { useFieldArray, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { bomSchema, type BOM } from '../data/schema'
import { type BOMItemDraft } from '../mutation-types'
import { createEmptyBOMFormValue } from '../utils/bom-form-defaults'
import { useBOMFormInitialization } from './use-bom-form-initialization'
import { useBOMFormOptions } from './use-bom-form-options'

interface UseBOMFormProps {
  currentRow?: BOM
  initialItems?: BOMItemDraft[]
  initialProductId?: string
  open: boolean
  isEdit: boolean
}

export function useBOMForm({ currentRow, initialItems, initialProductId, open, isEdit }: UseBOMFormProps) {
  const initialValues = useMemo<BOM>(() => createEmptyBOMFormValue(), [])
  const form = useForm<BOM>({
    resolver: zodResolver(bomSchema) as Resolver<BOM>,
    defaultValues: initialValues,
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const optionsResource = useBOMFormOptions({
    open,
  })
  const products = optionsResource.status === 'ready' ? optionsResource.products : []
  const materials = optionsResource.status === 'ready' ? optionsResource.materials : []

  useBOMFormInitialization({
    form,
    currentRow,
    initialItems,
    initialProductId,
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
  }
}
