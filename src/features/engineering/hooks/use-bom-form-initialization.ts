import { useEffect, useMemo } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { createLogger } from '@/lib/logger'
import { type BOM } from '../data/schema'
import { type BOMItemDraft } from '../mutation-types'
import {
  normalizeBOMControlFieldPatch,
  normalizeEngineeringBomChangeType,
  normalizeEngineeringBomStatus,
  normalizeEngineeringBomVersion,
  normalizeEngineeringRevisionNo,
} from '../utils/product-code-normalization'

const logger = createLogger('useBOMFormInitialization')

interface UseBOMFormInitializationParams {
  form: UseFormReturn<BOM>
  tracker: { reset: (data: BOM) => void }
  currentRow?: BOM
  initialItems?: BOMItemDraft[]
  initialProductId?: string
  open: boolean
  isEdit: boolean
}

export function useBOMFormInitialization({
  form,
  tracker,
  currentRow,
  initialItems,
  initialProductId,
  open,
  isEdit,
}: UseBOMFormInitializationParams) {
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

  useEffect(() => {
    const loadInitData = async () => {
      if (!open) return

      try {
        if (isEdit && currentRow) {
          const data = normalizeBOMControlFieldPatch({
            ...currentRow,
            isDefaultSite: currentRow.isDefaultSite ?? !currentRow.siteCode,
            items: (currentRow.items || []).map((item) => ({
              ...item,
              substitutes: item.substitutes || [],
            })),
          }) as BOM
          form.reset(data)
          tracker.reset(data)
          return
        }

        const initialVersion = normalizeEngineeringBomVersion(currentRow?.bomVersion || 'V1.0')

        const data = normalizeBOMControlFieldPatch({
          id: '',
          bomNo: '',
          productId: initialProductId || '',
          bomVersion: initialVersion,
          revisionNo: normalizeEngineeringRevisionNo('R1'),
          changeType: normalizeEngineeringBomChangeType('MANUAL'),
          isDefaultSite: true,
          status: normalizeEngineeringBomStatus('active'),
          items: (initialItems || []).map((item) => ({
            ...item,
            substitutes: item.substitutes || [],
          })),
          description: '',
          version: 1,
        }) as BOM
        form.reset(data)
        tracker.reset(data)
      } catch (error) {
        logger.error('BOM form load data failed', error)
      }
    }

    void loadInitData()
  }, [currentRow, form, initialItems, initialProductId, isEdit, open, tracker])

  return {
    initialValues,
  }
}
