import { useEffect, useMemo } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { createLogger } from '@/lib/logger'
import { type ChangeOrder, type BOM } from '../data/schema'
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
  changeOrders: ChangeOrder[]
  currentRow?: BOM
  initialItems?: BOMItemDraft[]
  initialProductId?: string
  open: boolean
  isEdit: boolean
}

export function useBOMFormInitialization({
  form,
  tracker,
  changeOrders,
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
      changeOrderId: '',
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
    if (!open) return
    const currentChangeOrderId = form.getValues('changeOrderId')
    if (currentChangeOrderId && !changeOrders.some((order) => order.id === currentChangeOrderId)) {
      form.setValue('changeOrderId', '', { shouldDirty: true })
    }
  }, [changeOrders, form, open])

  useEffect(() => {
    const loadInitData = async () => {
      if (!open) return

      try {
        if (isEdit && currentRow) {
          const data = normalizeBOMControlFieldPatch({
            ...currentRow,
            changeOrderId: currentRow.changeOrderId || '',
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
          changeOrderId: '',
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
