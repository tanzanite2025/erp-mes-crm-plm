import { useEffect } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    createResource,
    handleCreate,
    isCreating,
    createError,
    retryCreateResources,
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
  const createSaveDisabled = dialogMode === 'create' && createResource.status !== 'ready'

  const handleSaveQuote = async () => {
    if (dialogMode === 'create') {
      if (createResource.status !== 'ready') return
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

  const createEditor = createResource.status === 'error' ? (
    <div className='flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-500/25 bg-rose-500/3 px-6 text-center'>
      <AlertCircle className='size-8 text-rose-500' />
      <p className='mt-4 text-[10px] font-black uppercase tracking-widest text-rose-700'>报价创建字典加载失败</p>
      <p className='mt-3 max-w-xl text-[11px] font-bold leading-5 text-rose-700/80'>
        {createResource.error.message || '请重试后再创建报价。'}
      </p>
      <Button
        type='button'
        variant='outline'
        className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black uppercase tracking-widest'
        onClick={() => {
          void retryCreateResources()
        }}
      >
        重试
      </Button>
    </div>
  ) : createResource.status === 'loading' ? (
    <div className='flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 px-6 text-center'>
      <Loader2 className='size-8 animate-spin text-primary/40' />
      <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>报价创建字典加载中</p>
    </div>
  ) : (
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
        productDisplayLabelMap={createResources.productDisplayLabelMap}
        productDisplayProjectionMap={createResources.productDisplayProjectionMap}
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
        saveDisabled={createSaveDisabled}
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
