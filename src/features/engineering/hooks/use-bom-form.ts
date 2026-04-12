import { useEffect, useMemo } from 'react'
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { normalizeBomChangeType, normalizeBomEffectiveDate, normalizeBomNo, normalizeBomStatus, normalizeBomVersion, normalizeRevisionNo } from '@/lib/codecs/code-normalization'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { MATERIAL_OPTIONS_QUERY_KEY } from '../../material-archive/query-keys'
import { MaterialCoreService } from '../../material-archive/services/material-core-service'
import { bomSchema, type BOM, type ChangeOrder, type Product } from '../data/schema'
import { type BOMItemDraft } from '../mutation-types'
import { CHANGE_ORDERS_QUERY_KEY, PRODUCTS_QUERY_KEY } from '../query-keys'
import { changeOrderService } from '../services/change-order-service'
import { ProductCoreService } from '../services/product-core-service'

const logger = createLogger('useBOMForm')
const EMPTY_PRODUCTS: ReturnType<typeof Array<Product>> = []
const EMPTY_CHANGE_ORDERS: ChangeOrder[] = []
const EMPTY_MATERIALS: ReturnType<typeof Array<BOMItemDraft>> = []

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
      bomNo: normalizeBomNo(''),
      productId: '',
      changeOrderId: '',
      bomVersion: normalizeBomVersion('V1.0'),
      revisionNo: 'R1',
      changeType: normalizeBomChangeType('MANUAL'),
      isDefaultSite: true,
      status: normalizeBomStatus('active'),
      items: [],
      description: '',
      createdAt: new Date().toISOString(),
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

  const selectedProductId = useWatch({ control: form.control, name: 'productId' })

  const productsQuery = useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: () => ProductCoreService.getProducts(),
    enabled: open,
  })
  const changeOrdersQuery = useQuery({
    queryKey: [...CHANGE_ORDERS_QUERY_KEY, selectedProductId || 'all', 'options'],
    queryFn: () =>
      changeOrderService.getChangeOrders({
        isOptions: true,
        productId: selectedProductId || undefined,
      }),
    enabled: open,
  })
  const materialsQuery = useQuery({
    queryKey: MATERIAL_OPTIONS_QUERY_KEY,
    queryFn: () => MaterialCoreService.getMaterialOptions(),
    enabled: open,
  })
  const products = productsQuery.data ?? EMPTY_PRODUCTS
  const changeOrders = (changeOrdersQuery.data ?? EMPTY_CHANGE_ORDERS) as ChangeOrder[]
  const materials = materialsQuery.data ?? EMPTY_MATERIALS

  useEffect(() => {
    if (changeOrdersQuery.error) {
      logger.error('BOM form load change orders failed', changeOrdersQuery.error)
    }
  }, [changeOrdersQuery.error])

  useEffect(() => {
    if (materialsQuery.error) {
      logger.error('BOM form load materials failed', materialsQuery.error)
    }
  }, [materialsQuery.error])

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
          const data = {
            ...currentRow,
            bomNo: normalizeBomNo(currentRow.bomNo),
            bomVersion: normalizeBomVersion(currentRow.bomVersion),
            changeOrderId: currentRow.changeOrderId || '',
            revisionNo: normalizeRevisionNo(currentRow.revisionNo),
            changeType: normalizeBomChangeType(currentRow.changeType),
            status: normalizeBomStatus(currentRow.status),
            isDefaultSite: currentRow.isDefaultSite ?? !currentRow.siteCode,
            effectiveFrom: normalizeBomEffectiveDate(currentRow.effectiveFrom),
            effectiveTo: normalizeBomEffectiveDate(currentRow.effectiveTo),
            items: (currentRow.items || []).map((item) => ({
              ...item,
              substitutes: item.substitutes || [],
              standardUsage: item.standardUsage || 0, // 浠呰鍙栧悗绔繑鍥炵殑鏉权閲?
            })),
          } as BOM
          form.reset(data)
          tracker.reset(data)
          return
        }

        // [REMOVED] 鍓嶇涓嶅啀棰勮绠楀垵濮嬬増鏈彿锛岀敱鍚庣鍦ㄥ垱寤鸿姹傛椂鍒嗛厤鍒濆鍊兼垨閫氳繃 DTO 杩斿洖
        const initialVersion = currentRow?.bomVersion || 'V1.0'

        const data = {
          id: '',
          bomNo: normalizeBomNo(''),
          productId: initialProductId || '',
          changeOrderId: '',
          bomVersion: normalizeBomVersion(initialVersion),
          revisionNo: normalizeRevisionNo('R1'),
          changeType: normalizeBomChangeType('MANUAL'),
          isDefaultSite: true,
          status: normalizeBomStatus('active'),
          items: (initialItems || []).map((item) => ({
            ...item,
            substitutes: item.substitutes || [],
            standardUsage: item.standardUsage || 0,
          })),
          description: '',
          createdAt: new Date().toISOString(),
          version: 1,
        } as BOM
        form.reset(data)
        tracker.reset(data)
      } catch (error) {
        logger.error('BOM form load data failed', error)
      }
    }

    void loadInitData()
  }, [currentRow, form, initialItems, initialProductId, isEdit, open, tracker])

  return {
    form,
    deltaProxy,
    commitDelta: commit,
    isDeltaDirty: isDirty,
    fields,
    append,
    remove,
    products,
    materials,
    changeOrders,
  }
}
