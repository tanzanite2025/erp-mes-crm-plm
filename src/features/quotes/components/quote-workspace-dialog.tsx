import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { QuoteWorkspaceActionPanel } from '@/features/quotes/components/quote-workspace-action-panel'
import { QuoteWorkspaceDetailContent } from '@/features/quotes/components/quote-workspace-detail-content'
import { QuoteWorkspaceFooter } from '@/features/quotes/components/quote-workspace-footer'
import { QuoteWorkspaceHeader } from '@/features/quotes/components/quote-workspace-header'
import type { QuoteDetail } from '@/features/quotes/data/quote-detail'
import { useQuoteTransferAction } from '@/features/quotes/hooks/use-quote-transfer-action'
import { useQuoteTransferHandler } from '@/features/quotes/hooks/use-quote-transfer-handler'

type QuoteWorkspaceDialogProps = {
  open: boolean
  mode: 'create' | 'detail'
  detail: QuoteDetail | null
  isLoading: boolean
  detailError: string | null
  createEditor?: React.ReactNode
  editedAmountLabel: string
  editedRequirements: string
  onOpenChange: (open: boolean) => void
  onAmountLabelChange: (value: string) => void
  onRequirementsChange: (value: string) => void
  onExportPdf: () => void
  onSave: () => void
  isSaving: boolean
  saveDisabled?: boolean
  saveError: string | null
  onConvert: () => void
  isConverting: boolean
  convertError: string | null
}

export function QuoteWorkspaceDialog({
  open,
  mode,
  detail,
  isLoading,
  detailError,
  createEditor,
  editedAmountLabel,
  editedRequirements,
  onOpenChange,
  onAmountLabelChange,
  onRequirementsChange,
  onExportPdf,
  onSave,
  isSaving,
  saveDisabled = false,
  saveError,
  onConvert,
  isConverting,
  convertError,
}: QuoteWorkspaceDialogProps) {
  const isCreateMode = mode === 'create'
  const transferAction = useQuoteTransferAction(detail)
  const handleTransferClick = useQuoteTransferHandler(
    transferAction.label,
    transferAction.helper,
    transferAction.missing
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[92vh] w-[96vw] max-w-[96vw] sm:max-w-[96vw] xl:w-[1400px] xl:max-w-[1400px] overflow-hidden rounded-3xl border border-primary/20 p-0'>
        <QuoteWorkspaceHeader
          detail={detail}
          isCreateMode={isCreateMode}
          isLoading={isLoading}
          detailError={detailError}
        />

        <div className={`min-h-0 max-h-[calc(92vh-150px)] overflow-hidden ${isCreateMode ? 'flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_320px]' : 'grid lg:grid-cols-[minmax(0,1.25fr)_360px]'}`}>
          {isCreateMode ? (
            <div className='min-w-0 overflow-y-auto px-6 py-5'>{createEditor ?? null}</div>
          ) : (
            <QuoteWorkspaceDetailContent
              detail={detail}
              isLoading={isLoading}
              detailError={detailError}
              saveError={saveError}
              convertError={convertError}
              editedAmountLabel={editedAmountLabel}
              editedRequirements={editedRequirements}
              onAmountLabelChange={onAmountLabelChange}
              onRequirementsChange={onRequirementsChange}
            />
          )}

          <QuoteWorkspaceActionPanel
            isCreateMode={isCreateMode}
            hasDetail={Boolean(detail)}
            isSaving={isSaving}
            saveDisabled={saveDisabled}
            isConverting={isConverting}
            transferLabel={transferAction.label}
            transferHelper={transferAction.helper}
            onSave={onSave}
            onExportPdf={onExportPdf}
            onTransfer={handleTransferClick}
            onConvert={onConvert}
          />
        </div>

        <QuoteWorkspaceFooter
          detail={detail}
          isCreateMode={isCreateMode}
          isSaving={isSaving}
          saveDisabled={saveDisabled}
          onOpenChange={onOpenChange}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  )
}
