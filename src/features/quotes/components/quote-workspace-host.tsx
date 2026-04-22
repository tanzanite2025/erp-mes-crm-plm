import { useEffect } from 'react'
import { DocumentHeaderFields } from '@/features/sales-document/components/document-header-fields'
import { DocumentLinesEditor } from '@/features/sales-document/components/document-lines-editor'
import { DocumentNotesSection } from '@/features/sales-document/components/document-notes-section'
import { QuotePrintPreviewDialog } from '@/features/quotes/components/quote-print-preview-dialog'
import { QuoteWorkspaceDialog } from '@/features/quotes/components/quote-workspace-dialog'
import { useQuoteCreateEditor } from '@/features/quotes/hooks/use-quote-create-editor'
import { useConvertQuote } from '@/features/quotes/hooks/use-convert-quote'
import { useQuoteDetail } from '@/features/quotes/hooks/use-quote-detail'
import { useQuoteWorkspaceController } from '@/features/quotes/hooks/use-quote-workspace-controller'
import { useSaveQuote } from '@/features/quotes/hooks/use-save-quote'

type QuoteWorkspaceHostProps = {
  externalOpen?: boolean
  externalMode?: 'create' | 'detail' | null
  externalQuoteId?: string | null
  onExternalHandled?: () => void
}

export function QuoteWorkspaceHost({
  externalOpen = false,
  externalMode = null,
  externalQuoteId = null,
  onExternalHandled,
}: QuoteWorkspaceHostProps) {
  const {
    dialogMode,
    selectedQuoteId,
    isDialogOpen,
    isPrintPreviewOpen,
    editedAmountLabel,
    editedRequirements,
    isCreateModeOpen,
    setIsPrintPreviewOpen,
    setEditedAmountLabel,
    setEditedRequirements,
    handleSelectQuote,
    handleCreateQuote,
    handleDialogOpenChange,
    switchToDetailMode,
  } = useQuoteWorkspaceController()

  const { detail, isLoading: isDetailLoading, errorMessage: detailError } = useQuoteDetail(selectedQuoteId)
  const {
    formData: createFormData,
    setFormData: setCreateFormData,
    handleClassificationChange: handleCreateClassificationChange,
    handleAddLine: handleCreateAddLine,
    handleRemoveLine: handleCreateRemoveLine,
    updateLine: updateCreateLine,
    createResources,
    handleCreate,
    isCreating,
    createError,
  } = useQuoteCreateEditor(isCreateModeOpen, switchToDetailMode)
  const { saveQuote, isSaving, saveError } = useSaveQuote()
  const { convertQuote, isConverting, convertError } = useConvertQuote()

  useEffect(() => {
    if (!externalOpen || !externalMode) return

    if (externalMode === 'create') {
      handleCreateQuote()
      onExternalHandled?.()
      return
    }

    if (externalMode === 'detail' && externalQuoteId) {
      handleSelectQuote(externalQuoteId)
      onExternalHandled?.()
    }
  }, [externalMode, externalOpen, externalQuoteId, handleCreateQuote, handleSelectQuote, onExternalHandled])

  const parseAmountValue = (value: string) => {
    const normalized = value.replace(/[^\d.-]/g, '').trim()
    if (!normalized) return 0
    const parsed = Number(normalized)
    if (!Number.isFinite(parsed)) {
      throw new Error('报价金额格式无效')
    }
    return parsed
  }

  const parseCurrentDetailAmount = () => {
    if (!detail) return 0
    return parseAmountValue(detail.amountLabel)
  }

  const activeEditedAmountLabel = detail ? editedAmountLabel || detail.amountLabel : editedAmountLabel
  const activeEditedRequirements = detail ? editedRequirements || detail.requirements : editedRequirements
  const activeSaveError = dialogMode === 'create' ? createError : saveError
  const activeIsSaving = dialogMode === 'create' ? isCreating : isSaving

  const handleSaveQuote = async () => {
    if (dialogMode === 'create') {
      await handleCreate()
      return
    }

    if (!detail) return

    await saveQuote({
      id: detail.id,
      amount: parseAmountValue(activeEditedAmountLabel),
      requirements: activeEditedRequirements,
      previousAmount: parseCurrentDetailAmount(),
      previousRequirements: detail.requirements,
    })
  }

  const createEditor = (
    <div className='space-y-4'>
      <DocumentHeaderFields
        formData={createFormData}
        setFormData={setCreateFormData}
        customers={createResources.customers}
        onClassificationChange={handleCreateClassificationChange}
      />
      <DocumentLinesEditor
        appearances={createResources.appearances}
        lines={createFormData.lines || []}
        products={createResources.products}
        units={createResources.units}
        drillingOptions={createResources.drillingOptions}
        labelingOptions={createResources.labelingOptions}
        currency={createFormData.currency}
        onAddLine={handleCreateAddLine}
        onRemoveLine={handleCreateRemoveLine}
        onLineChange={updateCreateLine}
      />
      <DocumentNotesSection
        value={createFormData.requirements || ''}
        onChange={(value) => setCreateFormData((prev) => ({ ...prev, requirements: value }))}
      />
    </div>
  )

  return (
    <>
      <QuoteWorkspaceDialog
        open={isDialogOpen}
        mode={dialogMode}
        detail={detail}
        isLoading={isDetailLoading}
        detailError={detailError}
        createEditor={createEditor}
        editedAmountLabel={activeEditedAmountLabel}
        editedRequirements={activeEditedRequirements}
        onOpenChange={handleDialogOpenChange}
        onAmountLabelChange={setEditedAmountLabel}
        onRequirementsChange={setEditedRequirements}
        onExportPdf={() => setIsPrintPreviewOpen(true)}
        onSave={() => void handleSaveQuote()}
        isSaving={activeIsSaving}
        saveError={activeSaveError}
        onConvert={() => void (detail ? convertQuote(detail.id) : Promise.resolve())}
        isConverting={isConverting}
        convertError={convertError}
      />
      <QuotePrintPreviewDialog
        open={isPrintPreviewOpen}
        detail={detail}
        onOpenChange={setIsPrintPreviewOpen}
      />
    </>
  )
}
