import { Trash2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { AuditStamp } from '@/components/common/audit-stamp'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { type SalesOrder } from '../../data/schema'
import { useSalesOrderDetailActivity } from '../../hooks/use-sales-order-detail-activity'

interface SalesOrderDetailActivityProps {
  order: SalesOrder
  canHardDelete?: boolean
  onHardDelete?: (order: SalesOrder) => void
}

/**
 * SalesOrderDetailActivity - 重构后的销售订单动态详情
 * 已接入标准化的 AuditStamp 组件，确保审计轨迹一致
 */
export function SalesOrderDetailActivity({
  order,
  canHardDelete,
  onHardDelete,
}: SalesOrderDetailActivityProps) {
  const { t } = useLanguage()
  const { canDelete, handleHardDelete } = useSalesOrderDetailActivity({
    order,
    canHardDelete,
    onHardDelete,
    confirmText: t('common.actions.delete'),
  })

  return (
    <div className='animate-in space-y-3 rounded-xl border border-dashed border-muted/40 bg-muted/5 p-3 duration-500 slide-in-from-bottom-2'>
      <div className='relative space-y-3'>
        <AuditStamp
          module={AUDIT_MODULES.salesOrder}
          targetId={order.id}
          createdBy={order.createdBy}
          createdAt={order.createdAt}
          updatedBy={order.updatedBy}
          updatedAt={order.updatedAt}
          className='border-primary/10'
        />

        {canDelete && (
          <div className='flex justify-end border-t border-dashed border-muted-foreground/10 pt-3'>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 gap-2 rounded-full border border-destructive/10 px-5 text-[10px] font-black tracking-wide text-destructive uppercase transition-all hover:bg-destructive/10'
              onClick={handleHardDelete}
            >
              <Trash2 className='size-3.5' />
              {t('common.actions.delete')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
