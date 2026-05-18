import { useCallback, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import type { SalesOrder } from '../data/schema'

export function useSalesOrderPrint(order?: SalesOrder) {
  const { t } = useLanguage()
  const printRef = useRef<HTMLDivElement>(null)
  const reactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: order?.orderNo?.trim()
      ? `${order.orderNo}_order_document`
      : 'sales_order_document',
  })

  const handlePrintOrder = useCallback(() => {
    if (!order) {
      toast.error(t('tradingSalesOrder.print.previewUnavailable'))
      return
    }

    reactToPrint()
  }, [order, reactToPrint, t])

  return {
    printRef,
    handlePrintOrder,
  }
}
