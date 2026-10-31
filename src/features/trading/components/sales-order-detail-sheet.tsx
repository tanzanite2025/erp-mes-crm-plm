import type { SalesOrder } from '../data/schema'
import { SalesOrderDetail } from './sales-order-detail'
import { SalesOrderDetailReadingDrawer } from './sales-order-detail-reading-drawer'

interface SalesOrderDetailSheetProps {
  open: boolean
  orderId?: string
  order?: SalesOrder
  onOpenChange: (open: boolean) => void
  onDelete?: (order: SalesOrder) => void
}

export function SalesOrderDetailSheet({
  open,
  orderId,
  order,
  onOpenChange,
  onDelete,
}: SalesOrderDetailSheetProps) {
  return (
    <SalesOrderDetailReadingDrawer
      open={open}
      onOpenChange={onOpenChange}
      orderNo={order?.orderNo}
      customerName={order?.customerName}
    >
      <SalesOrderDetail orderId={orderId} order={order} onDelete={onDelete} />
    </SalesOrderDetailReadingDrawer>
  )
}
