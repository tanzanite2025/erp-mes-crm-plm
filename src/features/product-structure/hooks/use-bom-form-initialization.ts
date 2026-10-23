import { useEffect, useRef } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { createLogger } from '@/lib/logger'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'
import { type BOMItemDraft } from '../mutation-types'
import { createBOMFormValue } from '../utils/bom-form-defaults'

const logger = createLogger('useBOMFormInitialization')

interface UseBOMFormInitializationParams {
  form: UseFormReturn<BOM>
  currentRow?: BOM
  initialItems?: BOMItemDraft[]
  initialProductId?: string
  sections: BOMSectionOption[]
  open: boolean
  isEdit: boolean
  isReferenceDataReady: boolean
}

export function useBOMFormInitialization({
  form,
  currentRow,
  initialItems,
  initialProductId,
  sections,
  open,
  isEdit,
  isReferenceDataReady,
}: UseBOMFormInitializationParams) {
  const initializedEditingSessionRef = useRef<string | null>(null)
  useEffect(() => {
    if (!open) {
      initializedEditingSessionRef.current = null
      return
    }
    if (!isReferenceDataReady || (isEdit && !currentRow)) return
    const editingSessionKey = isEdit
      ? `edit:${currentRow!.id}`
      : `create:${initialProductId ?? ''}`
    // Reference catalog refreshes must not replace an in-progress BOM draft.
    if (initializedEditingSessionRef.current === editingSessionKey) return
    try {
      const data = createBOMFormValue({
        currentRow,
        initialItems,
        initialProductId,
        sections,
        isEdit,
      })
      form.reset(data)
      initializedEditingSessionRef.current = editingSessionKey
    } catch (error) {
      logger.error('BOM form load data failed', error)
    }
  }, [
    currentRow,
    form,
    initialItems,
    initialProductId,
    isEdit,
    open,
    sections,
    isReferenceDataReady,
  ])
}
