import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DictionaryCoreService } from '@/features/basic-settings/services/dictionary-core-service'
import { createLogger } from '@/lib/logger'
import { MaterialCoreService } from '../../material-archive/services/material-core-service'
import { type Material } from '../../material-archive/data/schema'
import { bomSchema, type BOM, type ChangeOrder, type Product } from '../data/schema'
import { changeOrderService } from '../services/change-order-service'
import { ProductCoreService } from '../services/product-core-service'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'

const logger = createLogger('useBOMForm')

interface UseBOMFormProps {
  currentRow?: BOM
  initialItems?: any[]
  initialProductId?: string
  open: boolean
  isEdit: boolean
}

const formatDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '')

export function useBOMForm({ currentRow, initialItems, initialProductId, open, isEdit }: UseBOMFormProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [dictEntries, setDictEntries] = useState<any[]>([])
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])

  const form = useForm<BOM>({
    resolver: zodResolver(bomSchema) as any,
    defaultValues: {
      id: '',
      bomNo: '',
      productId: '',
      changeOrderId: '',
      bomVersion: 'V1.0',
      revisionNo: 'V1.0',
      changeType: 'MANUAL',
      isDefaultSite: true,
      status: 'active',
      items: [],
      description: '',
      createdAt: new Date().toISOString(),
    },
  })

  const deltaTracker = useDeltaTracker<BOM>(currentRow || ({} as BOM), {
    enabled: isEdit,
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const selectedProductId = form.watch('productId')

  useEffect(() => {
    const subscription = form.watch(async () => {
      // [REMOVED] standardUsage 响应式计算已迁移至后端 Authority 引擎
      // [REMOVED] bomVersion 自动步进逻辑已迁移至后端
    })
    return () => subscription.unsubscribe()
  }, [form, isEdit])

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
          DictionaryCoreService.init(),
        ])

        setProducts(storedProducts || [])
        setMaterials(allMaterials || [])
        setDictEntries(DictionaryCoreService.getEntries() || [])

        if (isEdit && currentRow) {
                const data = {
                    ...currentRow,
                    changeOrderId: currentRow.changeOrderId || '',
                    revisionNo: currentRow.revisionNo || currentRow.bomVersion,
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
                deltaTracker.reset(data)
          return
        }

        // [REMOVED] 前端不再预计算初始版本号，由后端在创建请求时分配初始值或通过 DTO 返回
        const initialVersion = currentRow?.bomVersion || 'V1.0'

        const data = {
          id: '',
          bomNo: `BOM-${new Date().getFullYear()}${(Math.random() * 1000).toFixed(0).padStart(4, '0')}`,
          productId: initialProductId || '',
          changeOrderId: '',
          bomVersion: initialVersion,
          revisionNo: initialVersion,
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
        deltaTracker.reset(data)
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

    const handleDictsUpdate = async () => {
      setDictEntries(DictionaryCoreService.getEntries() || [])
    }

    window.addEventListener('xdfc_products_data_updated', handleProductsUpdate)
    window.addEventListener('xdfc_materials_updated', handleMaterialsUpdate)
    window.addEventListener('xdfc_dictionary_updated', handleDictsUpdate)

    return () => {
      window.removeEventListener('xdfc_products_data_updated', handleProductsUpdate)
      window.removeEventListener('xdfc_materials_updated', handleMaterialsUpdate)
      window.removeEventListener('xdfc_dictionary_updated', handleDictsUpdate)
    }
  }, [currentRow, form, initialItems, initialProductId, isEdit, open])

  return {
    form,
    fields,
    append,
    remove,
    products,
    materials,
    dictEntries,
    changeOrders,
    deltaTracker,
  }
}
