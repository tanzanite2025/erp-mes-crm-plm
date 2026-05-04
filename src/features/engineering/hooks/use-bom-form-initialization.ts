import { useEffect } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { createLogger } from '@/lib/logger'
import { type BOM } from '../data/schema'
import { type BOMItemDraft } from '../mutation-types'
import { createBOMFormValue } from '../utils/bom-form-defaults'

const logger = createLogger('useBOMFormInitialization')

interface UseBOMFormInitializationParams {
  form: UseFormReturn<BOM>
  currentRow?: BOM
  initialItems?: BOMItemDraft[]
  initialProductId?: string
  open: boolean
  isEdit: boolean
}

export function useBOMFormInitialization({
  form,
  currentRow,
  initialItems,
  initialProductId,
  open,
  isEdit,
}: UseBOMFormInitializationParams) {
  useEffect(() => {
    const loadInitData = async () => {
      if (!open) return

      try {
        const data = createBOMFormValue({
          currentRow,
          initialItems,
          initialProductId,
          isEdit,
        })
        form.reset(data)
      } catch (error) {
        logger.error('BOM form load data failed', error)
      }
    }

    void loadInitData()
  }, [currentRow, form, initialItems, initialProductId, isEdit, open])
}
