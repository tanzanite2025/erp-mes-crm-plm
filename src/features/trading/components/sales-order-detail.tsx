import { useEffect, useMemo, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { CADViewerDialog } from '@/features/engineering-db/components/cad-viewer/cad-viewer-dialog'
import { ExcelViewerDialog } from '@/features/engineering-db/components/excel-viewer/excel-viewer-dialog'
import { PDFViewerDialog } from '@/features/engineering-db/components/pdf-viewer/pdf-viewer-dialog'
import { engineeringDBService } from '@/features/engineering-db/services/engineering-db-service'
import { productService } from '@/features/engineering/services/product-service'
import { useCommands } from '@/features/system-mgmt/workflow-core/hooks/use-commands'
import { useAuthStore } from '@/stores/auth-store'
import type { SalesOrder } from '../data/schema'
import { useGetSalesOrderDetail, useSalesOrderMutations } from '../hooks/use-trading'
import { SalesOrderDetailActivity } from './parts/sales-order-detail-activity'
import { SalesOrderDetailHeader } from './parts/sales-order-detail-header'
import { SalesOrderDetailItemsCard } from './parts/sales-order-detail-items-card'
import { SalesOrderDetailSummary } from './parts/sales-order-detail-summary'

interface PreviewFile {
  fileName: string
  fileUrl: string
}

type DrawingType = 'spec' | 'drilling' | 'labeling'

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
  const { saveMutation, claimMutation } = useSalesOrderMutations()
  const user = useAuthStore((state) => state.user)
  const { commands } = useCommands()
  const canHardDelete = allowsAction('action_trading_sales_order_delete')
  const search = useSearch({ from: '/_authenticated/trading/sales-orders' })
  const activeCommand = useMemo(
    () => commands.find((command) => command.id === search?.activeCommandId),
    [commands, search?.activeCommandId]
  )
  const isClaimAction = Boolean(
    activeCommand?.actionType === 'CLAIM' ||
      activeCommand?.title?.toLowerCase().includes('claim') ||
      activeCommand?.title?.includes('认领')
  )

  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null)
  const [isCADOpen, setIsCADOpen] = useState(false)
  const [isPDFOpen, setIsPDFOpen] = useState(false)
  const [isExcelOpen, setIsExcelOpen] = useState(false)

  useEffect(() => {
    return () => {
      if (previewFile?.fileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewFile.fileUrl)
      }
    }
  }, [previewFile?.fileUrl])

  const handlePreview = async (
    productId: string | undefined,
    planId: string | undefined,
    type: DrawingType
  ) => {
    try {
      let targetId = planId
      if (!targetId && productId) {
        const product = await productService.getProductById(productId)
        if (product) {
          targetId =
            type === 'spec'
              ? (product as any).engineeringSpecId || (product as any).techSpecId
              : (product as any).drillingPlanId
        }
      }

      if (!targetId) {
        toast.error(t('tradingSalesOrder.preview.noTechFile'))
        return
      }

      let files: any[] = []
      if (type === 'spec') files = await engineeringDBService.getSpecs()
      else if (type === 'drilling') files = await engineeringDBService.getDrilling()
      else files = await engineeringDBService.getLabeling()

      const file = files.find((item) => item.id === targetId)
      if (!file || !file.fileUrl) {
        toast.error(t('tradingSalesOrder.preview.fileMissing'))
        return
      }

      const resolvedUrl = await engineeringDBService.resolveFileUrl(file.fileUrl)
      if (!resolvedUrl) {
        toast.error(t('tradingSalesOrder.preview.resolveFailed'))
        return
      }

      const fileName = file.name || t('tradingSalesOrder.preview.unknownFile')
      setPreviewFile({ fileName, fileUrl: resolvedUrl })

      const ext = file.fileExtension || fileName.split('.').pop()?.toLowerCase() || ''
      if (['dwg', 'dxf', 'rvt'].includes(ext)) setIsCADOpen(true)
      else if (['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) setIsPDFOpen(true)
      else if (['xlsx', 'xls', 'csv'].includes(ext)) setIsExcelOpen(true)
      else window.open(resolvedUrl, '_blank')
    } catch (error) {
      failLoudly(error, 'SalesOrderDetail.handlePreview')
    }
  }

  const handleMutateStatus = (payload: Partial<SalesOrder>) => {
    if (!allowsAction('action_trading_sales_order_manage')) return
    saveMutation.mutate(payload)
  }

  const handleClaimModel = (model: string) => {
    if (!order) return
    if (!allowsAction('action_trading_sales_order_manage')) return

    const lineNos = order.lines
      .filter((line) => line.productModel === model && !line.claimedBy)
      .map((line) => line.lineNo)
    claimMutation.mutate({
      orderId: order.id,
      lineNos,
      operator: user?.accountNo || 'Unknown',
    })
  }

  const handleClaimLine = (lineNo: number) => {
    if (!order) return
    if (!allowsAction('action_trading_sales_order_manage')) return

    claimMutation.mutate({
      orderId: order.id,
      lineNos: [lineNo],
      operator: user?.accountNo || 'Unknown',
    })
  }

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
        activeCommandTitle={activeCommand?.title}
        activeCommandContent={activeCommand?.content}
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
