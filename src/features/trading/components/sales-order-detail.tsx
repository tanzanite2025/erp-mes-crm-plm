import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { CADViewerDialog } from '@/features/engineering-db/components/cad-viewer/cad-viewer-dialog'
import { ExcelViewerDialog } from '@/features/engineering-db/components/excel-viewer/excel-viewer-dialog'
import { PDFViewerDialog } from '@/features/engineering-db/components/pdf-viewer/pdf-viewer-dialog'
import { useAuthStore } from '@/stores/auth-store'
import type { SalesOrder } from '../data/schema'
import { useSalesOrderCommandState } from '../hooks/use-sales-order-command-state'
import { useSalesOrderDetailActions } from '../hooks/use-sales-order-detail-actions'
import { useSalesOrderPreview } from '../hooks/use-sales-order-preview'
import { useGetSalesOrderDetail, useSalesOrderMutations } from '../sales'
import { SalesOrderDetailActivity } from './parts/sales-order-detail-activity'
import { SalesOrderDetailHeader } from './parts/sales-order-detail-header'
import { SalesOrderDetailItemsCard } from './parts/sales-order-detail-items-card'
import { SalesOrderDetailSummary } from './parts/sales-order-detail-summary'

export function SalesOrderDetail({
  order: initialOrder,
  onDelete,
}: {
  order?: SalesOrder
  onDelete?: (id: string) => void
}) {
  const { t } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const { data: detailedOrder, isLoading: isDetailLoading } = useGetSalesOrderDetail(
    initialOrder?.id || ''
  )
  const order = detailedOrder || initialOrder
  const { claimMutation, statusTransitionMutation, cancelMutation } = useSalesOrderMutations()
  const user = useAuthStore((state) => state.user)
  const canHardDelete = allowsAction('action_trading_sales_order_delete')
  const { activeCommandTitle, activeCommandContent, isClaimAction } = useSalesOrderCommandState()
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

  const { handleClaimLine, handleClaimModel, handleMutateStatus } = useSalesOrderDetailActions({
    order,
    allowsAction,
    claimMutation,
    statusTransitionMutation,
    cancelMutation,
    operator: user?.accountNo || 'Unknown',
    actorId: user?.id,
  })

  if (isDetailLoading) {
    return (
      <div className='flex h-full min-h-[400px] flex-col items-center justify-center space-y-3 opacity-50'>
        <Loader2 className='size-8 animate-spin text-primary' />
        <p className='text-[10px] font-black uppercase tracking-widest'>
          {t('tradingSalesOrder.detail.loading')}
        </p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className='flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-[32px] border-2 border-dashed border-muted/60 bg-muted/5 text-muted-foreground'>
        <div className='flex size-12 items-center justify-center rounded-full bg-muted animate-pulse'>
          <span className='text-xl'>?</span>
        </div>
        <span className='text-[10px] font-black uppercase tracking-widest'>
          {t('tradingSalesOrder.detail.empty')}
        </span>
      </div>
    )
  }

  return (
    <div className='space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500'>
      <SalesOrderDetailHeader
        order={order}
        isClaimAction={isClaimAction}
        activeCommandTitle={activeCommandTitle}
        activeCommandContent={activeCommandContent}
        onMutateStatus={handleMutateStatus}
      />

      <SalesOrderDetailSummary order={order} />

      <SalesOrderDetailItemsCard
        order={order}
        isClaimAction={isClaimAction}
        claimOperator={user?.accountNo || 'Unknown'}
        onClaimModel={handleClaimModel}
        onClaimLine={handleClaimLine}
        onPreview={handlePreview}
      />

      <SalesOrderDetailActivity
        order={order}
        canHardDelete={canHardDelete}
        onHardDelete={onDelete}
      />

      {previewFile && (
        <>
          <CADViewerDialog
            open={isCADOpen}
            onOpenChange={setIsCADOpen}
            fileName={previewFile.fileName}
            fileUrl={previewFile.fileUrl}
          />
          <PDFViewerDialog
            open={isPDFOpen}
            onOpenChange={setIsPDFOpen}
            fileName={previewFile.fileName}
            fileUrl={previewFile.fileUrl}
          />
          <ExcelViewerDialog
            open={isExcelOpen}
            onOpenChange={setIsExcelOpen}
            fileName={previewFile.fileName}
            fileUrl={previewFile.fileUrl}
          />
        </>
      )}
    </div>
  )
}

