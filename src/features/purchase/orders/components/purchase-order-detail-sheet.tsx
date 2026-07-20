import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { type PurchaseOrder, type PurchaseOrderListItem } from '../data/schema'
import { PurchaseOrderDetail } from './purchase-order-detail'

interface PurchaseOrderDetailSheetProps {
  open: boolean
  order?: PurchaseOrder | PurchaseOrderListItem
  title: string
  onOpenChange: (open: boolean) => void
  onDelete: (id: string) => void
}

export function PurchaseOrderDetailSheet({
  open,
  order,
  title,
  onOpenChange,
  onDelete,
}: PurchaseOrderDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='bottom'
        className='h-[60vh] w-full overflow-y-auto rounded-t-[32px] border-t-2 p-0 pt-2 shadow-2xl'
      >
        <SheetHeader className='border-b border-dashed px-6 pb-2'>
          <div className='flex items-center justify-between gap-3'>
            <div className='flex items-center gap-2'>
              <div className='size-2 animate-pulse rounded-full bg-primary' />
              <SheetTitle className='text-[10px] font-black tracking-[0.3em] text-muted-foreground uppercase'>
                {title}
              </SheetTitle>
            </div>
            {order?.id ? (
              <AuditTimelineTriggerButton
                module={AUDIT_MODULES.purchaseOrder}
                targetId={order.id}
                targetName={order.orderNo}
                iconOnly
                className='size-8 rounded-full border-dashed'
              />
            ) : null}
          </div>
        </SheetHeader>
        <div className='p-2'>
          <PurchaseOrderDetail order={order} onDelete={onDelete} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
