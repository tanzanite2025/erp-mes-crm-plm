import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { numberingService } from '@/features/basic-settings/services/numbering-service'
import { type SalesOrder, type SalesOrderLine, EMPTY_SALES_ORDER_LINE } from '../data/schema'
import { tradingQueryKeys } from '../query-keys'
import {
  DEFAULT_SALES_ORDER_CLASSIFICATION,
  DEFAULT_SALES_ORDER_TYPE,
  getSalesOrderClassificationExt,
} from '../data/sales-order-options'

export function buildNewSalesOrderInitialValues(initialBarcode: string): Partial<SalesOrder> {
  return {
    orderNo: '',
    orderName: '',
    customerName: '',
    customerId: '',
    type: DEFAULT_SALES_ORDER_TYPE,
    currency: 'CNY',
    paymentMethod: '',
    paymentMethodName: '',
    paymentTerm: '',
    paymentTermName: '',
    classification: DEFAULT_SALES_ORDER_CLASSIFICATION,
    orderDate: '',
    deliveryDate: '',
    status: 'Pending',
    purchaseOrderNo: '',
    barcode: initialBarcode,
    statusNote: '',
    lines: [{ ...EMPTY_SALES_ORDER_LINE, lineNo: 1 } as SalesOrderLine],
    evidences: [],
    quantity: 0,
    amount: 0,
    requirements: '',
    version: 1,
  }
}

export function useSalesOrderInit(
  initialOrder: SalesOrder | null | undefined,
  open: boolean,
) {
  const defaultClassAlias = getSalesOrderClassificationExt(DEFAULT_SALES_ORDER_CLASSIFICATION)
  const previewBarcodeQuery = useQuery({
    queryKey: tradingQueryKeys.salesOrderPreviewBarcode(defaultClassAlias),
    queryFn: () => numberingService.previewContractBarcode(defaultClassAlias),
    enabled: open && !initialOrder,
  })

  const initialFormData = useMemo(() => {
    if (initialOrder) {
      return initialOrder
    }

    return buildNewSalesOrderInitialValues(previewBarcodeQuery.data ?? '')
  }, [initialOrder, previewBarcodeQuery.data])

  return {
    initialFormData,
    isInitializing: open && !initialOrder && previewBarcodeQuery.isLoading,
    initError: previewBarcodeQuery.error,
    retryInit: previewBarcodeQuery.refetch,
  }
}
