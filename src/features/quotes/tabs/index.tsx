import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import { DocumentHeaderFields } from '@/features/sales-document/components/document-header-fields'
import { DocumentLinesEditor } from '@/features/sales-document/components/document-lines-editor'
import { DocumentNotesSection } from '@/features/sales-document/components/document-notes-section'
import {
  ENGINEERING_DB_DRILLING_QUERY_KEY,
  ENGINEERING_DB_LABELING_QUERY_KEY,
} from '@/features/engineering-db/query-keys'
import { ProductionDBService } from '@/features/engineering-db/services/production-db-service'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { QuotePrintPreviewDialog } from '@/features/quotes/components/quote-print-preview-dialog'
import { QuoteWorkspaceDialog } from '@/features/quotes/components/quote-workspace-dialog'
import { QuoteWorkspaceFilters } from '@/features/quotes/components/quote-workspace-filters'
import { QuoteWorkspaceList } from '@/features/quotes/components/quote-workspace-list'
import { useConvertQuote } from '@/features/quotes/hooks/use-convert-quote'
import { useSaveQuote } from '@/features/quotes/hooks/use-save-quote'
import { quoteQueryKeys } from '@/features/quotes/query-keys'
import { useGetCustomers } from '@/features/trading/customer'
import { auditUtils } from '@/lib/audit-utils'
import { useSalesOrderDrawingOptions } from '@/features/trading/hooks/use-sales-order-drawing-options'
import { useSalesOrderForm } from '@/features/trading/hooks/use-sales-order-form'
import type {
  QuoteCustomerFilter,
  QuoteStatusFilter,
  QuoteTypeFilter,
} from '@/features/quotes/data/quote-summary'
import { useQuoteDetail } from '@/features/quotes/hooks/use-quote-detail'
import { useQuoteList } from '@/features/quotes/hooks/use-quote-list'
import { useSalesOrderMutations } from '@/features/trading/sales'

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
  const queryClient = useQueryClient()
  const [dialogMode, setDialogMode] = useState<'create' | 'detail'>('detail')
  const [customer, setCustomer] = useState<QuoteCustomerFilter>('all')
  const [status, setStatus] = useState<QuoteStatusFilter>('all')
  const [quoteType, setQuoteType] = useState<QuoteTypeFilter>('all')
  const [keyword, setKeyword] = useState('')
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false)
  const [editedAmountLabel, setEditedAmountLabel] = useState('')
  const [editedRequirements, setEditedRequirements] = useState('')

  const activeCustomerLabel = useMemo(() => customerLabels[customer] ?? '全部客户', [customer])
  const activeStatusLabel = useMemo(() => statusLabels[status] ?? '全部状态', [status])
  const activeTypeLabel = useMemo(() => typeLabels[quoteType] ?? '全部类型', [quoteType])
  const isCreateModeOpen = isDialogOpen && dialogMode === 'create'
  const { rows, summary, isLoading, isError: isListError, errorMessage: listError } = useQuoteList({
    customer,
    status,
    quoteType,
    keyword,
  })
  const { data: customers = [] } = useGetCustomers({ enabled: isCreateModeOpen })
  const { data: products = [] } = useGetProducts({ enabled: isCreateModeOpen })
  const { units = [] } = useUnitsQuery({ enabled: isCreateModeOpen })
  const drillingQuery = useQuery({
    queryKey: ENGINEERING_DB_DRILLING_QUERY_KEY,
    queryFn: () => ProductionDBService.getDrilling(),
    enabled: isCreateModeOpen,
  })
  const labelingQuery = useQuery({
    queryKey: ENGINEERING_DB_LABELING_QUERY_KEY,
    queryFn: () => ProductionDBService.getLabeling(),
    enabled: isCreateModeOpen,
  })
  const drillingOptions = useSalesOrderDrawingOptions(drillingQuery.data)
  const labelingOptions = useSalesOrderDrawingOptions(labelingQuery.data)
  const {
    formData: createFormData,
    setFormData: setCreateFormData,
    handleClassificationChange: handleCreateClassificationChange,
    handleAddLine: handleCreateAddLine,
    handleRemoveLine: handleCreateRemoveLine,
    updateLine: updateCreateLine,
    validate: validateCreateForm,
    prepareToSave: prepareCreateToSave,
  } = useSalesOrderForm(undefined, isCreateModeOpen)
  const { detail, isLoading: isDetailLoading, errorMessage: detailError } = useQuoteDetail(selectedQuoteId)
  const { createMutation } = useSalesOrderMutations()
  const { saveQuote, isSaving, saveError } = useSaveQuote()
  const { convertQuote, isConverting, convertError } = useConvertQuote()

  const handleSelectQuote = (quoteId: string) => {
    setDialogMode('detail')
    setSelectedQuoteId(quoteId)
    setIsDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setDialogMode('detail')
      setSelectedQuoteId(null)
      setEditedAmountLabel('')
      setEditedRequirements('')
    }
  }

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
      if (!validateCreateForm()) {
        return
      }
      const finalData = await prepareCreateToSave()
      if (!finalData) {
        return
      }
      const stampedData = auditUtils.stamp(finalData, 'create')
      const created = await createMutation.mutateAsync(stampedData)
      await queryClient.invalidateQueries({ queryKey: quoteQueryKeys.all() })
      setDialogMode('detail')
      setSelectedQuoteId(created.id)
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

  const handleCreateQuote = () => {
    setDialogMode('create')
    setSelectedQuoteId(null)
    setEditedAmountLabel('')
    setEditedRequirements('')
    setIsDialogOpen(true)
  }

  const activeEditedAmountLabel = detail ? editedAmountLabel || detail.amountLabel : editedAmountLabel
  const activeEditedRequirements = detail ? editedRequirements || detail.requirements : editedRequirements
  const activeSaveError = dialogMode === 'create'
    ? createMutation.error instanceof Error
      ? createMutation.error.message
      : null
    : saveError
  const activeIsSaving = dialogMode === 'create' ? createMutation.isPending : isSaving
  const createEditor = (
    <div className='space-y-4'>
      <DocumentHeaderFields
        formData={createFormData}
        setFormData={setCreateFormData}
        customers={customers}
        onClassificationChange={handleCreateClassificationChange}
      />
      <DocumentLinesEditor
        lines={createFormData.lines || []}
        products={products}
        units={units}
        drillingOptions={drillingOptions}
        labelingOptions={labelingOptions}
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
