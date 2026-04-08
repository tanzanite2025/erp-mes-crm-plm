import { useEffect } from 'react'
import { DictionaryCoreService } from '@/features/basic-settings/services/dictionary-core-service'
import { numberingService } from '@/features/basic-settings/services/numbering-service'
import { type SalesOrder, type SalesOrderLine, EMPTY_SALES_ORDER_LINE } from '../data/schema'
import { generateSalesOrderId } from '../utils/sales-order-calc'

export function useSalesOrderInit(
  initialOrder: SalesOrder | null | undefined,
  open: boolean,
  setFormData: React.Dispatch<React.SetStateAction<Partial<SalesOrder>>>
) {
  useEffect(() => {
    const initForm = async () => {
      if (!open) return

      if (initialOrder) {
        setFormData(initialOrder)
        return
      }

      const defaultClass = 'GENERAL'
      const classOpt = DictionaryCoreService.getOptions('ORDER_CLASSIFICATION').find((item) => item.value === defaultClass)
      const initialBarcode = await numberingService.previewContractBarcode(classOpt?.ext || 'GS')
      const newId = generateSalesOrderId()
      const typeOpt = DictionaryCoreService.getOptions('ORDER_TYPE')[0]

      setFormData({
        id: newId,
        orderNo: newId,
        orderName: '',
        customerName: '',
        customerId: '',
        type: typeOpt?.value || '',
        currency: 'CNY',
        classification: defaultClass,
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        status: 'Pending',
        purchaseOrderNo: '',
        barcode: initialBarcode,
        statusNote: '',
        lines: [{ ...EMPTY_SALES_ORDER_LINE, lineNo: 1 } as SalesOrderLine],
        quantity: 0,
        amount: 0,
        requirements: '',
      })
    }

    initForm()
  }, [initialOrder, open, setFormData])
}
