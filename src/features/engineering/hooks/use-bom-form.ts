import { useEffect, useState } from 'react'
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createLogger } from '@/lib/logger'
import { MaterialCoreService } from '../../material-archive/services/material-core-service'
import { type MaterialOption } from '../../material-archive/data/schema'
import { bomSchema, type BOM, type BOMItem, type ChangeOrder, type Product } from '../data/schema'
import { changeOrderService } from '../services/change-order-service'
import { ProductCoreService } from '../services/product-core-service'

const logger = createLogger('useBOMForm')

interface UseBOMFormProps {
  currentRow?: BOM
  initialItems?: Array<Partial<BOMItem>>
  initialProductId?: string
  open: boolean
  isEdit: boolean
}

const formatDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '')

export function useBOMForm({ currentRow, initialItems, initialProductId, open, isEdit }: UseBOMFormProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [materials, setMaterials] = useState<MaterialOption[]>([])
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])

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

  useEffect(() => {
    if (!open) return

    let cancelled = false

    const loadChangeOrders = async () => {
      try {
        const orders = await changeOrderService.getChangeOrders({
          isOptions: true,
          productId: selectedProductId || undefined,
        })

        if (!cancelled) {
          setChangeOrders(orders || [])
          const currentChangeOrderId = form.getValues('changeOrderId')
          if (currentChangeOrderId && !orders.some((order) => order.id === currentChangeOrderId)) {
            form.setValue('changeOrderId', '', { shouldDirty: true })
          }
        }
      } catch (error) {
        logger.error('BOM form load change orders failed', error)
        if (!cancelled) {
          setChangeOrders([])
        }
      }
    }

    loadChangeOrders()

    const handleChangeOrdersUpdate = () => {
      loadChangeOrders()
    }

    window.addEventListener('xdfc_change_orders_updated', handleChangeOrdersUpdate)
    return () => {
      cancelled = true
      window.removeEventListener('xdfc_change_orders_updated', handleChangeOrdersUpdate)
    }
  }, [form, open, selectedProductId])

  useEffect(() => {
    const loadInitData = async () => {
      if (!open) return

      try {
        const [storedProducts, allMaterials] = await Promise.all([
          ProductCoreService.getProducts(),
          MaterialCoreService.getMaterialOptions(),
        ])

        setProducts(storedProducts || [])
        setMaterials(allMaterials || [])

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

    loadInitData()

    const handleProductsUpdate = async () => {
      const nextProducts = await ProductCoreService.getProducts()
      setProducts(nextProducts || [])
    }

    const handleMaterialsUpdate = async () => {
      const nextMaterials = await MaterialCoreService.getMaterialOptions()
      setMaterials(nextMaterials || [])
    }

    window.addEventListener('xdfc_products_data_updated', handleProductsUpdate)
    window.addEventListener('xdfc_materials_updated', handleMaterialsUpdate)

    return () => {
      window.removeEventListener('xdfc_products_data_updated', handleProductsUpdate)
      window.removeEventListener('xdfc_materials_updated', handleMaterialsUpdate)
    }
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
