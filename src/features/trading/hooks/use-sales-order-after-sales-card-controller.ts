import { useNavigate } from '@tanstack/react-router'
import type { SalesOrder } from '../data/schema'
import { buildSalesOrderAfterSalesCardViewModel } from '../utils/sales-order-after-sales-card-view-model'
import { useSalesOrderAfterSalesCardResources } from './use-sales-order-after-sales-card-resources'

export function useSalesOrderAfterSalesCardController(
  orders: ReadonlyArray<SalesOrder>
) {
  const navigate = useNavigate()
  const resources = useSalesOrderAfterSalesCardResources(orders)

  const getViewModel = (order: SalesOrder) =>
    buildSalesOrderAfterSalesCardViewModel({
      order,
      summary: resources.summaryByOrderId.get(order.id),
      summariesReady: resources.summariesReady,
      isLoading: resources.isLoading,
      isError: resources.isError,
      error: resources.error,
    })

  const openReturns = (order: SalesOrder) => {
    void navigate({
      to: '/trading/sales-returns',
      search: {
        customerId: order.customerId || undefined,
        customerName: order.customerName || undefined,
        sourceOrderId: order.id,
        status: 'all',
      },
    })
  }

  const openExchanges = (order: SalesOrder) => {
    void navigate({
      to: '/trading/sales-exchanges',
      search: {
        customerId: order.customerId || undefined,
        customerName: order.customerName || undefined,
        sourceOrderId: order.id,
        status: 'all',
      },
    })
  }

  return {
    getViewModel,
    openReturns,
    openExchanges,
  }
}

export type SalesOrderAfterSalesCardController = ReturnType<
  typeof useSalesOrderAfterSalesCardController
>