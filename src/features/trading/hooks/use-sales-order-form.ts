import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { dictionaryService } from '@/features/basic-settings/services/dictionary-service'
import { numberingService } from '@/features/basic-settings/services/numbering-service'
import { type SalesOrder } from '../data/schema'
import { validateSalesOrder } from '../utils/sales-order-validator'
import { useSalesOrderInit } from './use-sales-order-init'
import { useSalesOrderOps } from './use-sales-order-ops'

export function useSalesOrderForm(initialOrder: SalesOrder | null | undefined, open: boolean) {
  const { t } = useLanguage()
  const [formData, setFormData] = useState<Partial<SalesOrder>>({
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
  })

  // 1. 初始化逻辑 (已抽离)
  useSalesOrderInit(initialOrder, open, setFormData)

  // 2. 行操作逻辑 (已抽离)
  const { handleAddLine, handleRemoveLine, updateLine } = useSalesOrderOps(setFormData)

  // 3. 状态切换：分类变更
  const handleClassificationChange = useCallback(async (value: string) => {
    const classOpt = dictionaryService.getOptions('ORDER_CLASSIFICATION').find((item) => item.value === value)
    const newBarcode = await numberingService.previewContractBarcode(classOpt?.ext || 'GS')

    setFormData((prev) => ({
      ...prev,
      classification: value,
      barcode: newBarcode,
    }))
  }, [])

  // 4. 校验逻辑集成
  const validate = (): boolean => {
    const { isValid, errorKey } = validateSalesOrder(formData, initialOrder)
    if (!isValid && errorKey) {
      toast.error(t(errorKey as any))
      return false
    }
    return true
  }

  // 5. 保存前置准备：正式生成流水码
  const prepareToSave = async (): Promise<SalesOrder | null> => {
    const classOpt = dictionaryService.getOptions('ORDER_CLASSIFICATION').find(
      (item) => item.value === formData.classification
    )
    let finalBarcode = formData.barcode || ''
    if (!initialOrder) {
      finalBarcode = await numberingService.generateContractBarcode(classOpt?.ext || 'GS')
    }
    return { ...formData, barcode: finalBarcode } as SalesOrder
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
  }
}
