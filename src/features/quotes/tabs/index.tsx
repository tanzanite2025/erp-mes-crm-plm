import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'
import { DocumentHeaderFields } from '@/features/sales-document/components/document-header-fields'
import { DocumentLinesEditor } from '@/features/sales-document/components/document-lines-editor'
import { DocumentNotesSection } from '@/features/sales-document/components/document-notes-section'
import { QuotePrintPreviewDialog } from '@/features/quotes/components/quote-print-preview-dialog'
import { QuoteWorkspaceDialog } from '@/features/quotes/components/quote-workspace-dialog'
import { QuoteWorkspaceFilters } from '@/features/quotes/components/quote-workspace-filters'
import { QuoteWorkspaceList } from '@/features/quotes/components/quote-workspace-list'
import { useQuoteCreateEditor } from '@/features/quotes/hooks/use-quote-create-editor'
import { useConvertQuote } from '@/features/quotes/hooks/use-convert-quote'
import { useQuoteWorkspaceController } from '@/features/quotes/hooks/use-quote-workspace-controller'
import { useSaveQuote } from '@/features/quotes/hooks/use-save-quote'
import type {
  QuoteCustomerFilter,
  QuoteStatusFilter,
  QuoteTypeFilter,
} from '@/features/quotes/data/quote-summary'
import { useQuoteDetail } from '@/features/quotes/hooks/use-quote-detail'
import { useQuoteList } from '@/features/quotes/hooks/use-quote-list'

const customerLabels: Record<string, string> = {
  all: '全部客户',
  vip: '重点客户',
  'long-term': '长期客户',
  new: '新客户',
}

const statusLabels: Record<string, string> = {
  all: '全部状态',
  draft: '草稿',
  pending: '待确认',
  converted: '已转正式单',
  voided: '已作废',
}

const typeLabels: Record<string, string> = {
  all: '全部类型',
  retail: '零售',
  wholesale: '批发',
  sample: '打样',
}

export function QuoteOrdersTab() {
  const { t } = useLanguage()
  const [customer, setCustomer] = useState<QuoteCustomerFilter>('all')
  const [status, setStatus] = useState<QuoteStatusFilter>('all')
  const [quoteType, setQuoteType] = useState<QuoteTypeFilter>('all')
  const [keyword, setKeyword] = useState('')
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

  const activeCustomerLabel = useMemo(() => customerLabels[customer] ?? '全部客户', [customer])
  const activeStatusLabel = useMemo(() => statusLabels[status] ?? '全部状态', [status])
  const activeTypeLabel = useMemo(() => typeLabels[quoteType] ?? '全部类型', [quoteType])
  const { rows, summary, isLoading, isError: isListError, errorMessage: listError } = useQuoteList({
    customer,
    status,
    quoteType,
    keyword,
  })
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

  const handleConvertQuote = async () => {
    if (!detail) return
    await convertQuote(detail.id)
  }

  const activeEditedAmountLabel = detail ? editedAmountLabel || detail.amountLabel : editedAmountLabel
  const activeEditedRequirements = detail ? editedRequirements || detail.requirements : editedRequirements
  const activeSaveError = dialogMode === 'create' ? createError : saveError
  const activeIsSaving = dialogMode === 'create' ? isCreating : isSaving
  const createEditor = (
    <div className='space-y-4'>
      <DocumentHeaderFields
        formData={createFormData}
        setFormData={setCreateFormData}
        customers={createResources.customers}
        onClassificationChange={handleCreateClassificationChange}
      />
      <DocumentLinesEditor
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
    <div className='flex min-h-0 flex-1 flex-col gap-6 animate-in fade-in duration-700'>
      <PageHeader
        icon={FileText}
        title={t('commandMenu.items.quoteManagement')}
        description={t('trading.quotes.description')}
      />
      <div className='flex min-h-0 flex-1 flex-col gap-4'>
        <QuoteWorkspaceFilters
          customer={customer}
          keyword={keyword}
          quoteType={quoteType}
          status={status}
          onCreateQuote={handleCreateQuote}
          onCustomerChange={setCustomer}
          onKeywordChange={setKeyword}
          onQuoteTypeChange={setQuoteType}
          onStatusChange={setStatus}
        />
        <QuoteWorkspaceList
          activeCustomerLabel={activeCustomerLabel}
          activeStatusLabel={activeStatusLabel}
          activeTypeLabel={keyword ? `${activeTypeLabel} · ${keyword}` : activeTypeLabel}
          rows={rows}
          resultsLabel={summary.amountLabel}
          isLoading={isLoading}
          isError={isListError}
          errorMessage={listError}
          onCreateQuote={handleCreateQuote}
          onSelectQuote={handleSelectQuote}
        />
      </div>
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
        onConvert={() => void handleConvertQuote()}
        isConverting={isConverting}
        convertError={convertError}
      />
      <QuotePrintPreviewDialog
        open={isPrintPreviewOpen}
        detail={detail}
        onOpenChange={setIsPrintPreviewOpen}
      />
    </div>
  )
}
