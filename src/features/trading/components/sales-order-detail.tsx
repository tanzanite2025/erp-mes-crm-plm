import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import type { SalesOrder } from '../data/schema'
import { useSalesOrderCommandState } from '../hooks/use-sales-order-command-state'
import { useSalesOrderDetailActions } from '../hooks/use-sales-order-detail-actions'
import { useSalesOrderPreview } from '../hooks/use-sales-order-preview'
import { useSalesOrderPrint } from '../hooks/use-sales-order-print'
import { useGetSalesOrderDetail, useSalesOrderMutations } from '../sales'
import { SalesOrderPrint } from './parts/sales-order-print'
import { SalesOrderDetailContent } from './sales-order-detail-content'

export function SalesOrderDetail({
  orderId,
  order: initialOrder,
  onDelete,
}: {
  orderId?: string
  order?: SalesOrder
  onDelete?: (order: SalesOrder) => void
}) {
  const { t } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const detailQueryId = orderId || initialOrder?.id || ''
  const { data: detailedOrder, isLoading: isDetailLoading } =
    useGetSalesOrderDetail(detailQueryId)
  const order = detailedOrder || initialOrder
  const { claimMutation, statusTransitionMutation, cancelMutation } =
    useSalesOrderMutations()
  const user = useAuthStore((state) => state.user)
  const canHardDelete = allowsAction('action_trading_sales_order_delete')
  const { activeCommandTitle, activeCommandContent, isClaimAction } =
    useSalesOrderCommandState()
  const { printRef, handlePrintOrder } = useSalesOrderPrint(order)
  const {
    handlePreview,
    previewFile,
    isCADOpen,
    isExcelOpen,
    isPDFOpen,
    setIsCADOpen,
    setIsExcelOpen,
    setIsPDFOpen,
  } = useSalesOrderPreview()

  const { handleClaimLine, handleClaimModel, handleMutateStatus } =
    useSalesOrderDetailActions({
      order,
      t,
      allowsAction,
      claimMutation,
      statusTransitionMutation,
      cancelMutation,
      operator: user?.accountNo ?? '',
      actorId: user?.id,
    })

  if (isDetailLoading) {
    return (
      <div className='flex h-full min-h-[400px] flex-col items-center justify-center space-y-3 opacity-50'>
        <Loader2 className='size-8 animate-spin text-primary' />
        <p className='text-[10px] font-black tracking-widest uppercase'>
          {t('tradingSalesOrder.detail.loading')}
        </p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className='flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-[32px] border-2 border-dashed border-muted/60 bg-muted/5 text-muted-foreground'>
        <div className='flex size-12 animate-pulse items-center justify-center rounded-full bg-muted'>
          <span className='text-xl'>?</span>
        </div>
        <span className='text-[10px] font-black tracking-widest uppercase'>
          {t('tradingSalesOrder.detail.empty')}
        </span>
      </div>
    )
  }

  return (
    <>
      <div className='hidden'>
        <SalesOrderPrint ref={printRef} order={order} />
      </div>

      <SalesOrderDetailContent
        order={order}
        isClaimAction={isClaimAction}
        activeCommandTitle={activeCommandTitle}
        activeCommandContent={activeCommandContent}
        claimOperator={user?.accountNo ?? ''}
        canHardDelete={canHardDelete}
        onMutateStatus={handleMutateStatus}
        onPrint={handlePrintOrder}
        onClaimModel={handleClaimModel}
        onClaimLine={handleClaimLine}
        onPreview={handlePreview}
        onHardDelete={onDelete}
        previewFile={previewFile ?? undefined}
        isCADOpen={isCADOpen}
        isExcelOpen={isExcelOpen}
        isPDFOpen={isPDFOpen}
        setIsCADOpen={setIsCADOpen}
        setIsExcelOpen={setIsExcelOpen}
        setIsPDFOpen={setIsPDFOpen}
      />
    </>
  )
}
