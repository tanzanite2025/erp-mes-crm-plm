import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import type { SalesOrder } from '../data/schema'
import { SalesOrderDetail } from './sales-order-detail'

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
  const title = order?.orderNo?.trim() ? `销售单详情 · ${order.orderNo}` : '销售单详情'
  const description = order?.customerName?.trim()
    ? `客户主体：${order.customerName}`
    : '查看销售单明细与执行动作。'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='bottom'
        className='h-[78vh] gap-0 rounded-t-[20px] border-t border-dashed border-primary/20 bg-background px-0 pb-0 pt-0 shadow-2xl'
      >
        <SheetTitle className='sr-only'>{title}</SheetTitle>
        <SheetDescription className='sr-only'>{description}</SheetDescription>
        <ScrollArea className='min-h-0 flex-1'>
          <div className='px-4 pb-3 pt-10'>
            <SalesOrderDetail orderId={orderId} order={order} onDelete={onDelete} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
