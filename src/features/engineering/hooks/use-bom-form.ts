import { useEffect, useMemo } from 'react'
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { MATERIAL_OPTIONS_QUERY_KEY } from '../../material-archive/query-keys'
import { MaterialCoreService } from '../../material-archive/services/material-core-service'
import { bomSchema, type BOM, type ChangeOrder, type Product } from '../data/schema'
import { type BOMItemDraft } from '../mutation-types'
import { CHANGE_ORDERS_QUERY_KEY, productOptionsQueryKey } from '../query-keys'
import { changeOrderService } from '../services/change-order-service'
import { ProductCoreService } from '../services/product-core-service'

const logger = createLogger('useBOMForm')

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
      changeOrderId: '',
      bomVersion: 'V1.0',
      revisionNo: 'R1',
      changeType: 'MANUAL',
      isDefaultSite: true,
      status: 'active',
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

  const selectedProductId = useWatch({ control: form.control, name: 'productId' })

  const productsQuery = useQuery({
    queryKey: productOptionsQueryKey(),
    queryFn: () => ProductCoreService.getProducts({ isOptions: true }),
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
  const products = useMemo(() => {
    if (productsQuery.data) return productsQuery.data
    if (productsQuery.isPending) return [] as Product[]
    const error = productsQuery.error instanceof Error
      ? productsQuery.error
      : new Error('[CRITICAL] Missing BOM form products query data')
    failLoudly(error, 'useBOMForm.products')
    return [] as Product[]
  }, [productsQuery.data, productsQuery.error, productsQuery.isPending])

  const changeOrders = useMemo(() => {
    if (changeOrdersQuery.data) return changeOrdersQuery.data as ChangeOrder[]
    if (changeOrdersQuery.isPending) return [] as ChangeOrder[]
    const error = changeOrdersQuery.error instanceof Error
      ? changeOrdersQuery.error
      : new Error('[CRITICAL] Missing BOM form change orders query data')
    failLoudly(error, 'useBOMForm.changeOrders')
    return [] as ChangeOrder[]
  }, [changeOrdersQuery.data, changeOrdersQuery.error, changeOrdersQuery.isPending])

  const materials = useMemo(() => {
    if (materialsQuery.data) return materialsQuery.data
    if (materialsQuery.isPending) return [] as BOMItemDraft[]
    const error = materialsQuery.error instanceof Error
      ? materialsQuery.error
      : new Error('[CRITICAL] Missing BOM form materials query data')
    failLoudly(error, 'useBOMForm.materials')
    return [] as BOMItemDraft[]
  }, [materialsQuery.data, materialsQuery.error, materialsQuery.isPending])

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
            changeOrderId: currentRow.changeOrderId || '',
            isDefaultSite: currentRow.isDefaultSite ?? !currentRow.siteCode,
            items: (currentRow.items || []).map((item) => ({
              ...item,
              substitutes: item.substitutes || [],
            })),
          } as BOM
          form.reset(data)
          tracker.reset(data)
          return
        }

        // [REMOVED] 前端不再预计算初始版本号；创建时的初始值应由后端保存链路分配或通过 DTO 返回。
        const initialVersion = currentRow?.bomVersion || 'V1.0'

        const data = {
          id: '',
          bomNo: '',
          productId: initialProductId || '',
          changeOrderId: '',
          bomVersion: initialVersion,
          revisionNo: 'R1',
          changeType: 'MANUAL',
          isDefaultSite: true,
          status: 'active',
          items: (initialItems || []).map((item) => ({
            ...item,
            substitutes: item.substitutes || [],
          })),
          description: '',
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
