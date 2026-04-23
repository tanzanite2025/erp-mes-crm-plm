import { CADViewerDialog } from '@/features/engineering-db/components/cad-viewer/cad-viewer-dialog'
import { ExcelViewerDialog } from '@/features/engineering-db/components/excel-viewer/excel-viewer-dialog'
import { PDFViewerDialog } from '@/features/engineering-db/components/pdf-viewer/pdf-viewer-dialog'
import type { SalesOrder } from '../data/schema'
import { SalesOrderDetailActivity } from './parts/sales-order-detail-activity'
import { SalesOrderDetailHeader } from './parts/sales-order-detail-header'
import { SalesOrderDetailItemsCard } from './parts/sales-order-detail-items-card'
import { SalesOrderPackagingPreviewCard } from './parts/sales-order-packaging-preview-card'
import { SalesOrderDetailSummary } from './parts/sales-order-detail-summary'

interface SalesOrderDetailContentProps {
  order: SalesOrder
  isClaimAction: boolean
  activeCommandTitle?: string
  activeCommandContent?: string
  claimOperator: string
  canHardDelete?: boolean
  onMutateStatus: (payload: Partial<SalesOrder>) => void
  onClaimModel: (model: string) => void
  onClaimLine: (lineNo: number) => void
  onPreview: (productId: string | undefined, planId: string | undefined, type: 'spec' | 'drilling' | 'labeling') => void
  onHardDelete?: (order: SalesOrder) => void
  previewFile?: { fileName: string; fileUrl: string }
  isCADOpen: boolean
  isExcelOpen: boolean
  isPDFOpen: boolean
  setIsCADOpen: (open: boolean) => void
  setIsExcelOpen: (open: boolean) => void
  setIsPDFOpen: (open: boolean) => void
}

export function SalesOrderDetailContent({
  order,
  isClaimAction,
  activeCommandTitle,
  activeCommandContent,
  claimOperator,
  canHardDelete,
  onMutateStatus,
  onClaimModel,
  onClaimLine,
  onPreview,
  onHardDelete,
  previewFile,
  isCADOpen,
  isExcelOpen,
  isPDFOpen,
  setIsCADOpen,
  setIsExcelOpen,
  setIsPDFOpen,
}: SalesOrderDetailContentProps) {
  return (
    <div className='space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500'>
      <SalesOrderDetailHeader
        order={order}
        isClaimAction={isClaimAction}
        activeCommandTitle={activeCommandTitle}
        activeCommandContent={activeCommandContent}
        onMutateStatus={onMutateStatus}
      />

      <SalesOrderDetailSummary order={order} />

      <SalesOrderPackagingPreviewCard order={order} />

      <SalesOrderDetailItemsCard
        order={order}
        isClaimAction={isClaimAction}
        claimOperator={claimOperator}
        onClaimModel={onClaimModel}
        onClaimLine={onClaimLine}
        onPreview={onPreview}
      />

      <SalesOrderDetailActivity
        order={order}
        canHardDelete={canHardDelete}
        onHardDelete={onHardDelete}
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
