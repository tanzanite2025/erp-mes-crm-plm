import { useMemo } from 'react'
import { useFieldArray, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { bomSchema, type BOM } from '../data/schema'
import { type BOMItemDraft } from '../mutation-types'
import {
  normalizeEngineeringBomChangeType,
  normalizeEngineeringBomStatus,
  normalizeEngineeringBomVersion,
  normalizeEngineeringRevisionNo,
} from '../utils/product-code-normalization'
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
  const initialValues = useMemo<BOM>(
    () => ({
      id: '',
      bomNo: '',
      productId: '',
      bomVersion: normalizeEngineeringBomVersion('V1.0'),
      revisionNo: normalizeEngineeringRevisionNo('R1'),
      changeType: normalizeEngineeringBomChangeType('MANUAL'),
      isDefaultSite: true,
      status: normalizeEngineeringBomStatus('active'),
      items: [],
      description: '',
      version: 1,
    }),
    []
  )
  const form = useForm<BOM>({
    resolver: zodResolver(bomSchema) as Resolver<BOM>,
    defaultValues: initialValues,
  })
  const { tracker, deltaProxy, commit, isDirty } = useDeltaTracker<BOM>(initialValues, open)

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
    tracker,
    currentRow,
    initialItems,
    initialProductId,
    open,
    isEdit,
  })

  return {
    form,
    deltaProxy,
    commitDelta: commit,
    isDeltaDirty: isDirty,
    fields,
    append,
    remove,
    optionsResource,
    products,
    materials,
  }
}
