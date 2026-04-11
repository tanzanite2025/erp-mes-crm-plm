import { useEffect } from 'react'
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { MATERIAL_OPTIONS_QUERY_KEY } from '../../material-archive/query-keys'
import { MaterialCoreService } from '../../material-archive/services/material-core-service'
import { bomSchema, type BOM, type BOMItem, type ChangeOrder, type Product } from '../data/schema'
import { type BOMItemDraft } from '../mutation-types'
import { CHANGE_ORDERS_QUERY_KEY, PRODUCTS_QUERY_KEY } from '../query-keys'
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

const formatDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '')

export function useBOMForm({ currentRow, initialItems, initialProductId, open, isEdit }: UseBOMFormProps) {
  const form = useForm<BOM>({
    resolver: zodResolver(bomSchema) as Resolver<BOM>,
    defaultValues: {
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
      createdAt: new Date().toISOString(),
    },
  })

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
  const products = productsQuery.data ?? []
  const changeOrders = (changeOrdersQuery.data ?? []) as ChangeOrder[]
  const materials = materialsQuery.data ?? []

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
                    bomDisplayVersion: currentRow.bomDisplayVersion || currentRow.bomVersion,
                    changeOrderId: currentRow.changeOrderId || '',
                    revisionNo: currentRow.revisionNo || 'R1',
                    changeType: currentRow.changeType || 'MANUAL',
                    isDefaultSite: currentRow.isDefaultSite ?? !currentRow.siteCode,
                    effectiveFrom: formatDateInput(currentRow.effectiveFrom),
                    effectiveTo: formatDateInput(currentRow.effectiveTo),
                    items: (currentRow.items || []).map((item) => ({
                      ...item,
                      substitutes: item.substitutes || [],
                      standardUsage: item.standardUsage || 0, // 仅读取后端返回的权用量
                    })),
                } as BOM
                form.reset(data)
          return
        }

        // [REMOVED] 前端不再预计算初始版本号，由后端在创建请求时分配初始值或通过 DTO 返回
        const initialVersion = currentRow?.bomVersion || 'V1.0'

        const data = {
          id: '',
          bomNo: '',
          productId: initialProductId || '',
          changeOrderId: '',
          bomVersion: initialVersion,
          bomDisplayVersion: initialVersion,
          revisionNo: 'R1',
          changeType: 'MANUAL',
          isDefaultSite: true,
          status: 'active',
          items: (initialItems || []).map((item) => ({
            ...item,
            substitutes: item.substitutes || [],
            standardUsage: item.standardUsage || 0,
          })),
          description: '',
          createdAt: new Date().toISOString(),
        } as BOM
        form.reset(data)
      } catch (error) {
        logger.error('BOM form load data failed', error)
      }
    }

    void loadInitData()
  }, [currentRow, form, initialItems, initialProductId, isEdit, open])

  return {
    form,
    fields,
    append,
    remove,
    products,
    materials,
    changeOrders,
  }
}
