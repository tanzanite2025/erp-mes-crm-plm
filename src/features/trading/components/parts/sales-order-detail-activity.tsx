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
    <section className='flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:p-4 lg:flex-row lg:items-baseline'>
      <h2 className='shrink-0 text-base font-semibold'>
        {t('tradingSalesOrder.detail.activityTitle')}
      </h2>
      <div className='relative min-w-0 flex-1 space-y-3'>
        <AuditStamp
          module={AUDIT_MODULES.salesOrder}
          targetId={order.id}
          createdBy={order.createdBy}
          createdAt={order.createdAt}
          updatedBy={order.updatedBy}
          updatedAt={order.updatedAt}
          className='gap-x-6 gap-y-1 border-0 p-0 sm:flex-row sm:flex-wrap sm:items-center'
          presentation='detail'
          labels={{
            created: t('tradingSalesOrder.detail.createdRecord'),
            updated: t('tradingSalesOrder.detail.info.updatedBy'),
            timeline: t('tradingSalesOrder.detail.readingLayout.fullActivity'),
          }}
        />

        {canDelete && (
          <div className='flex justify-end border-t border-border pt-4'>
            <Button
              variant='ghost'
              size='sm'
              className='min-h-9 gap-2 rounded-lg border border-destructive/20 px-4 text-sm font-medium text-destructive hover:bg-destructive/10'
              onClick={handleHardDelete}
            >
              <Trash2 className='size-3.5' />
              {t('common.actions.delete')}
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
