import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { numberingService } from '@/features/basic-settings/services/numbering-service'
import {
  DEFAULT_SALES_ORDER_CLASSIFICATION,
  getSalesOrderClassificationExt,
} from '../data/sales-order-options'
import { type SalesOrder, createEmptySalesOrderDraft } from '../data/schema'
import { tradingQueryKeys } from '../query-keys'

export function buildNewSalesOrderInitialValues(initialBarcode: string) {
  return createEmptySalesOrderDraft(initialBarcode)
}

export function useSalesOrderInit(
  initialOrder: SalesOrder | null | undefined,
  open: boolean
) {
  const defaultClassAlias = getSalesOrderClassificationExt(
    DEFAULT_SALES_ORDER_CLASSIFICATION
  )
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
