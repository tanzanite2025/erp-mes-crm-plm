import { useEffect } from 'react'
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
}

export function useBOMFormInitialization({
  form,
  currentRow,
  initialItems,
  initialProductId,
  sections,
  open,
  isEdit,
}: UseBOMFormInitializationParams) {
  useEffect(() => {
    const loadInitData = async () => {
      if (!open) return
      if (isEdit && !currentRow) return

      try {
        const data = createBOMFormValue({
          currentRow,
          initialItems,
          initialProductId,
          sections,
          isEdit,
        })
        form.reset(data)
      } catch (error) {
        logger.error('BOM form load data failed', error)
      }
    }

    void loadInitData()
  }, [currentRow, form, initialItems, initialProductId, isEdit, open, sections])
}
