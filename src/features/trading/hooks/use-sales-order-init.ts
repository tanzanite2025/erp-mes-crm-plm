import { useEffect } from 'react'
import { numberingService } from '@/features/basic-settings/services/numbering-service'
import { failLoudly } from '@/lib/safe-catch'
import { type SalesOrder, type SalesOrderLine, EMPTY_SALES_ORDER_LINE } from '../data/schema'
import {
  DEFAULT_SALES_ORDER_CLASSIFICATION,
  DEFAULT_SALES_ORDER_TYPE,
  getSalesOrderClassificationExt,
} from '../data/sales-order-options'

export function useSalesOrderInit(
  initialOrder: SalesOrder | null | undefined,
  open: boolean,
  setFormData: React.Dispatch<React.SetStateAction<Partial<SalesOrder>>>
) {
  useEffect(() => {
    const initForm = async () => {
      if (!open) return

      try {
        if (initialOrder) {
          setFormData(initialOrder)
          return
        }

        const defaultClass = DEFAULT_SALES_ORDER_CLASSIFICATION
        const initialBarcode = await numberingService.previewContractBarcode(
          getSalesOrderClassificationExt(defaultClass)
        )

        setFormData({
          orderName: '',
          customerName: '',
          customerId: '',
          type: DEFAULT_SALES_ORDER_TYPE,
          currency: 'CNY',
          paymentMethod: '',
          paymentMethodName: '',
          paymentTerm: '',
          paymentTermName: '',
          classification: defaultClass,
          orderDate: '',
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
      } catch (error) {
        failLoudly(error, 'useSalesOrderInit.initForm')
      }
    }

    void initForm()
  }, [initialOrder, open, setFormData])
}
