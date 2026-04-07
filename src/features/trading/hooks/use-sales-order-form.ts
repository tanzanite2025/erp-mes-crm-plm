import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { dictionaryService } from '@/features/basic-settings/services/dictionary-service'
import { numberingService } from '@/features/basic-settings/services/numbering-service'
import { type SalesOrder } from '../data/schema'
import { validateSalesOrder } from '../utils/sales-order-validator'
import { useSalesOrderInit } from './use-sales-order-init'
import { useSalesOrderOps } from './use-sales-order-ops'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'

const DEFAULT_ORDER: Partial<SalesOrder> = {
  orderNo: '',
  orderName: '',
  customerName: '',
  customerId: '',
  type: '',
  currency: 'CNY',
  classification: 'GENERAL',
  orderDate: new Date().toISOString().split('T')[0],
  deliveryDate: '',
  status: 'Pending',
  purchaseOrderNo: '',
  barcode: '',
  statusNote: '',
  lines: [],
  quantity: 0,
  amount: 0,
  requirements: '',
  version: 1,
}

export function useSalesOrderForm(initialOrder: SalesOrder | null | undefined, open: boolean) {
  const { t } = useLanguage()

  // 使用 SDRTS DeltaTracker 进行状态追踪
  const memoizedInitial = useMemo(() => initialOrder || (DEFAULT_ORDER as SalesOrder), [initialOrder])
  const { data: formData, commit, isDirty } = useDeltaTracker(memoizedInitial, open)

  /**
   * 兼容性 Shim: 模拟 useState 的 setFormData
   * 实际上操作的是 ProxyTracker 的 Proxy 对象
   */
  const setFormData = useCallback((updater: any) => {
    if (typeof updater === 'function') {
      const next = updater(formData)
      Object.assign(formData, next)
    } else {
      Object.assign(formData, updater)
    }
  }, [formData])

  // 1. 初始化逻辑 (已抽离) - 这里的 setFormData 会操作 proxy
  useSalesOrderInit(initialOrder, open, setFormData)

  // 2. 行操作逻辑 (已抽离)
  const { handleAddLine, handleRemoveLine, updateLine } = useSalesOrderOps(setFormData)

  // 3. 状态切换：分类变更
  const handleClassificationChange = useCallback(async (value: string) => {
    const classOpt = dictionaryService.getOptions('ORDER_CLASSIFICATION').find((item) => item.value === value)
    const newBarcode = await numberingService.previewContractBarcode(classOpt?.ext || 'GS')

    formData.classification = value
    formData.barcode = newBarcode
  }, [formData])

  // 4. 校验逻辑集成
  const validate = (): boolean => {
    const { isValid, errorKey } = validateSalesOrder(formData as any, initialOrder)
    if (!isValid && errorKey) {
      toast.error(t(errorKey as any))
      return false
    }
    return true
  }

  // 5. 保存前置准备
  const prepareToSave = async () => {
    const classOpt = dictionaryService.getOptions('ORDER_CLASSIFICATION').find(
      (item) => item.value === formData.classification
    )
    
    if (!initialOrder) {
      formData.barcode = await numberingService.generateContractBarcode(classOpt?.ext || 'GS')
      return formData as SalesOrder
    }

    return formData as SalesOrder
  }

  return {
    formData,
    setFormData,
    handleClassificationChange,
    handleAddLine,
    handleRemoveLine,
    updateLine,
    validate,
    prepareToSave,
    commit,
    isDirty,
  }
}
