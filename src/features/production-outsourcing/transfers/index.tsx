import { useMemo, useState } from 'react'
import type { TranslationKey } from '@/locales'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Search,
  ScanLine,
} from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import {
  industrialPanelClassName,
  industrialPanelGradientClassName,
} from '@/components/uds/industrial-panel'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { OutsourceStatCard } from '../components/outsource-stat-card'
import type {
  OutsourceInspectionDisposition,
  OutsourceInspectionFormValues,
  OutsourceInspectionResult,
  OutsourceDiagnosticsResponse,
  OutsourceOrder,
  OutsourceOrderLine,
  OutsourceOrderStatus,
  OutsourceTransferFormValues,
} from '../data/outsource-order'
import { useOutsourceInventoryCategoryOptions } from '../hooks/use-outsource-inventory-category-options'
import {
  useOutsourceDiagnostics,
  useOutsourceOrderMutations,
  useOutsourceOrders,
} from '../hooks/use-outsource-orders'

type ExecutionAction = 'send' | 'return' | 'inspect'

interface ActiveAction {
  action: ExecutionAction
  order: OutsourceOrder
  line: OutsourceOrderLine
}

const PRODUCTION_OUTSOURCE_CATEGORY = 'PRODUCTION_OUTSOURCE'

function statusLabelKey(status: OutsourceOrderStatus): TranslationKey {
  return `productionOutsourcing.orders.statuses.${status}` as TranslationKey
}

function statusTone(status: OutsourceOrderStatus) {
  if (status === 'CLOSED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
  }
  if (status === 'RETURNED') {
    return 'border-violet-500/30 bg-violet-500/10 text-violet-600'
  }
  if (status === 'SENT' || status === 'IN_PROCESS') {
    return 'border-blue-500/30 bg-blue-500/10 text-blue-600'
  }
  if (status === 'RELEASED') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-600'
  }
  return 'border-muted bg-muted text-muted-foreground'
}

function lineDisposedQuantity(line: OutsourceOrderLine) {
  return line.acceptedQuantity + line.reworkQuantity + line.scrapQuantity
}

function remainingSendQuantity(line: OutsourceOrderLine) {
  return Math.max(0, line.quantity - line.sentQuantity)
}

function remainingReturnQuantity(line: OutsourceOrderLine) {
  return Math.max(0, line.sentQuantity - line.returnedQuantity)
}

function remainingInspectionQuantity(line: OutsourceOrderLine) {
  return Math.max(0, line.returnedQuantity - lineDisposedQuantity(line))
}

function defaultActionQuantity(
  line: OutsourceOrderLine,
  action: ExecutionAction
) {
  const remaining =
    action === 'send'
      ? remainingSendQuantity(line)
      : action === 'return'
        ? remainingReturnQuantity(line)
        : remainingInspectionQuantity(line)
  return Math.min(1, remaining || 1)
}

function quantityText(value: number, uom: string) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)} ${uom}`
}

export function OutsourceTransferManagement() {
  const { t } = useLanguage()
  const { allowsAction, isChecking } = usePermissionActions()
  const [search, setSearch] = useState('')
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null)
  const ordersQuery = useOutsourceOrders({ search, status: 'ALL' })
  const diagnosticsQuery = useOutsourceDiagnostics()
  const { sendLineMutation, returnLineMutation, inspectLineMutation } =
    useOutsourceOrderMutations()
  const orders = ordersQuery.data?.items
  const canTransfer = allowsAction('action_outsource_transfer_execute')
  const canInspect = allowsAction('action_outsource_inspection_submit')
  const isSubmitting =
    sendLineMutation.isPending ||
    returnLineMutation.isPending ||
    inspectLineMutation.isPending

  const executionOrders = useMemo(
    () =>
      (orders ?? []).filter(
        (order) => order.status !== 'DRAFT' && order.status !== 'CANCELED'
      ),
    [orders]
  )
  const stats = useMemo(() => {
    const lines = executionOrders.flatMap((order) => order.lines)
    return {
      released: lines.filter((line) => line.status === 'RELEASED').length,
      sent: lines.reduce((sum, line) => sum + line.sentQuantity, 0),
      returned: lines.reduce((sum, line) => sum + line.returnedQuantity, 0),
      pendingInspection: lines.reduce(
        (sum, line) => sum + remainingInspectionQuantity(line),
        0
      ),
    }
  }, [executionOrders])

  if (isForbiddenError(ordersQuery.error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex animate-in flex-col gap-4 pb-8 duration-500 fade-in'>
      <IndustrialHeader
        icon={ScanLine}
        title={t('productionOutsourcing.execution.title')}
        description={t('productionOutsourcing.execution.description')}
      />

      <div className='grid gap-3 md:grid-cols-4'>
        <OutsourceStatCard
          label={t('productionOutsourcing.execution.stats.releasedLines')}
          value={stats.released}
        />
        <OutsourceStatCard
          label={t('productionOutsourcing.execution.stats.sent')}
          value={stats.sent}
          className='bg-blue-500/5'
          labelClassName='text-blue-600'
          valueClassName='text-blue-600'
        />
        <OutsourceStatCard
          label={t('productionOutsourcing.execution.stats.returned')}
          value={stats.returned}
          className='bg-violet-500/5'
          labelClassName='text-violet-600'
          valueClassName='text-violet-600'
        />
        <OutsourceStatCard
          label={t('productionOutsourcing.execution.stats.pendingInspection')}
          value={stats.pendingInspection}
          className='bg-amber-500/5'
          labelClassName='text-amber-600'
          valueClassName='text-amber-600'
        />
      </div>

      <OutsourceDiagnosticsPanel
        diagnostics={diagnosticsQuery.data}
        isLoading={diagnosticsQuery.isLoading}
        isFetching={diagnosticsQuery.isFetching}
        onRefresh={() => {
          void diagnosticsQuery.refetch()
        }}
      />

      <div className='relative w-full md:max-w-sm'>
        <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/50' />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('productionOutsourcing.execution.searchPlaceholder')}
          className='pl-10'
        />
      </div>

      {ordersQuery.isLoading ? (
        <Card className={cn(industrialPanelClassName, 'h-48')} />
      ) : executionOrders.length === 0 ? (
        <Card className={industrialPanelClassName}>
          <div className={industrialPanelGradientClassName} />
          <CardContent className='relative z-10 flex flex-col items-center gap-3 py-14 text-center'>
            <ScanLine className='size-10 text-muted-foreground/30' />
            <p className='text-sm text-muted-foreground'>
              {t('productionOutsourcing.execution.empty')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 xl:grid-cols-2'>
          {executionOrders.map((order) => (
            <Card key={order.id} className={industrialPanelClassName}>
              <div className={industrialPanelGradientClassName} />
              <CardHeader className='relative z-10 border-b border-dashed border-muted/20 bg-background/20 p-4'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <CardTitle className='truncate text-base font-semibold'>
                      {order.orderNo}
                    </CardTitle>
                    <p className='mt-1 truncate text-xs text-muted-foreground'>
                      {order.partnerNameSnapshot || '-'} ·{' '}
                      {order.sourceNo || '-'}
                    </p>
                  </div>
                  <Badge
                    variant='outline'
                    className={`text-xs font-medium ${statusTone(order.status)}`}
                  >
                    {t(statusLabelKey(order.status))}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className='relative z-10 space-y-3 p-4'>
                {order.lines.map((line) => {
                  const canSend =
                    canTransfer &&
                    order.status !== 'CLOSED' &&
                    remainingSendQuantity(line) > 0
                  const canReturn =
                    canTransfer && remainingReturnQuantity(line) > 0
                  const canSubmitInspection =
                    canInspect && remainingInspectionQuantity(line) > 0

                  return (
                    <div
                      key={line.id}
                      className='rounded-md border border-dashed border-muted/30 bg-muted/20 p-3'
                    >
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-semibold'>
                            {line.productName || line.productCode || '-'}
                          </p>
                          <p className='mt-1 text-xs text-muted-foreground'>
                            {line.processName || '-'} ·{' '}
                            {quantityText(line.quantity, line.uom)}
                          </p>
                        </div>
                        <Badge
                          variant='outline'
                          className={`text-xs font-medium ${statusTone(line.status)}`}
                        >
                          {t(statusLabelKey(line.status))}
                        </Badge>
                      </div>

                      <div className='mt-3 grid gap-2 text-xs sm:grid-cols-3'>
                        <ProgressCell
                          label={t(
                            'productionOutsourcing.execution.fields.sent'
                          )}
                          value={quantityText(line.sentQuantity, line.uom)}
                        />
                        <ProgressCell
                          label={t(
                            'productionOutsourcing.execution.fields.returned'
                          )}
                          value={quantityText(line.returnedQuantity, line.uom)}
                        />
                        <ProgressCell
                          label={t(
                            'productionOutsourcing.execution.fields.disposed'
                          )}
                          value={quantityText(
                            lineDisposedQuantity(line),
                            line.uom
                          )}
                        />
                      </div>

                      <div className='mt-3 flex flex-wrap justify-end gap-2 border-t border-dashed border-muted/20 pt-3'>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={!canSend || isChecking || isSubmitting}
                          title={
                            canSend
                              ? undefined
                              : t(
                                  'productionOutsourcing.execution.disabled.send'
                                )
                          }
                          onClick={() =>
                            setActiveAction({ action: 'send', order, line })
                          }
                          className='rounded-full'
                        >
                          <ArrowUpFromLine className='mr-2 size-3.5' />
                          {t('productionOutsourcing.execution.actions.send')}
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={!canReturn || isChecking || isSubmitting}
                          title={
                            canReturn
                              ? undefined
                              : t(
                                  'productionOutsourcing.execution.disabled.return'
                                )
                          }
                          onClick={() =>
                            setActiveAction({ action: 'return', order, line })
                          }
                          className='rounded-full'
                        >
                          <ArrowDownToLine className='mr-2 size-3.5' />
                          {t('productionOutsourcing.execution.actions.return')}
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={
                            !canSubmitInspection || isChecking || isSubmitting
                          }
                          title={
                            canSubmitInspection
                              ? undefined
                              : t(
                                  'productionOutsourcing.execution.disabled.inspect'
                                )
                          }
                          onClick={() =>
                            setActiveAction({ action: 'inspect', order, line })
                          }
                          className='rounded-full'
                        >
                          <ClipboardCheck className='mr-2 size-3.5' />
                          {t('productionOutsourcing.execution.actions.inspect')}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <OutsourceExecutionDialog
        key={
          activeAction
            ? `${activeAction.action}:${activeAction.line.id}`
            : 'closed'
        }
        activeAction={activeAction}
        isSubmitting={isSubmitting}
        onOpenChange={(open) => {
          if (!open) {
            setActiveAction(null)
          }
        }}
        onSubmit={(values) => {
          if (!activeAction) {
            return
          }
          if (!values.productBarcode.trim()) {
            toast.error(t('productionOutsourcing.execution.validation.barcode'))
            return
          }
          if (activeAction.action === 'inspect') {
            inspectLineMutation.mutate(
              {
                lineId: activeAction.line.id,
                values: values as OutsourceInspectionFormValues,
              },
              { onSuccess: () => setActiveAction(null) }
            )
            return
          }
          const transferValues = values as OutsourceTransferFormValues
          if (
            !transferValues.sourceCategory.trim() ||
            !transferValues.targetCategory.trim()
          ) {
            toast.error(
              t('productionOutsourcing.execution.validation.categoryRequired')
            )
            return
          }
          const mutation =
            activeAction.action === 'send'
              ? sendLineMutation
              : returnLineMutation
          mutation.mutate(
            {
              lineId: activeAction.line.id,
              values: transferValues,
            },
            { onSuccess: () => setActiveAction(null) }
          )
        }}
      />
    </div>
  )
}

function OutsourceDiagnosticsPanel({
  diagnostics,
  isLoading,
  isFetching,
  onRefresh,
}: {
  diagnostics?: OutsourceDiagnosticsResponse
  isLoading: boolean
  isFetching: boolean
  onRefresh: () => void
}) {
  const { t } = useLanguage()
  const summary = diagnostics?.summary
  const issues = diagnostics?.issues ?? []
  const totalIssues = summary?.totalIssues ?? 0
  const hasCritical = (summary?.criticalIssues ?? 0) > 0
  const statusTone = hasCritical
    ? 'border-rose-500/30 bg-rose-500/10 text-rose-600'
    : totalIssues > 0
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
  const StatusIcon = isLoading
    ? Loader2
    : totalIssues > 0
      ? AlertTriangle
      : CheckCircle2
  const generatedAt = formatDiagnosticsTime(diagnostics?.generatedAt)

  return (
    <Card className={cn(industrialPanelClassName, 'py-0')}>
      <div className={industrialPanelGradientClassName} />
      <CardContent className='relative z-10 space-y-3 p-3 sm:p-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <div
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full border',
                statusTone
              )}
            >
              <StatusIcon
                className={cn('size-4', isLoading ? 'animate-spin' : '')}
              />
            </div>
            <div className='min-w-0'>
              <p className='text-sm font-semibold'>
                {t('productionOutsourcing.execution.diagnostics.title')}
              </p>
              <p className='truncate text-xs text-muted-foreground'>
                {isLoading
                  ? t('productionOutsourcing.execution.diagnostics.loading')
                  : totalIssues > 0
                    ? t(
                        'productionOutsourcing.execution.diagnostics.statusIssues',
                        { count: totalIssues }
                      )
                    : t('productionOutsourcing.execution.diagnostics.statusOk')}
                {summary?.issuesTruncated
                  ? ` · ${t('productionOutsourcing.execution.diagnostics.truncated')}`
                  : ''}
                {generatedAt
                  ? ` · ${t('productionOutsourcing.execution.diagnostics.generatedAt', { time: generatedAt })}`
                  : ''}
              </p>
            </div>
          </div>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8 rounded-full'
            disabled={isFetching}
            title={t('productionOutsourcing.execution.diagnostics.refresh')}
            onClick={onRefresh}
          >
            <RefreshCw
              className={cn('size-3.5', isFetching && 'animate-spin')}
            />
          </Button>
        </div>

        {summary ? (
          <div className='grid gap-2 sm:grid-cols-3 xl:grid-cols-6'>
            <DiagnosticsMetric
              label={t(
                'productionOutsourcing.execution.diagnostics.metrics.activeLines'
              )}
              value={summary.activeLines}
            />
            <DiagnosticsMetric
              label={t(
                'productionOutsourcing.execution.diagnostics.metrics.pendingReturn'
              )}
              value={formatDiagnosticsNumber(summary.pendingReturnQuantity)}
            />
            <DiagnosticsMetric
              label={t(
                'productionOutsourcing.execution.diagnostics.metrics.pendingInspection'
              )}
              value={formatDiagnosticsNumber(summary.pendingInspectionQuantity)}
            />
            <DiagnosticsMetric
              label={t(
                'productionOutsourcing.execution.diagnostics.metrics.transfers'
              )}
              value={summary.transferFacts}
            />
            <DiagnosticsMetric
              label={t(
                'productionOutsourcing.execution.diagnostics.metrics.inspections'
              )}
              value={summary.inspectionFacts}
            />
            <DiagnosticsMetric
              label={t(
                'productionOutsourcing.execution.diagnostics.metrics.notifications'
              )}
              value={summary.notificationFailed}
              tone={
                summary.notificationFailed > 0
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }
            />
          </div>
        ) : null}

        {issues.length > 0 ? (
          <div className='space-y-2'>
            {issues.slice(0, 4).map((issue) => (
              <div
                key={issue.id}
                className={cn(
                  'grid gap-1 rounded-md border bg-background/60 px-3 py-2 text-xs',
                  issue.severity === 'CRITICAL'
                    ? 'border-rose-500/25'
                    : 'border-amber-500/25'
                )}
              >
                <div className='flex min-w-0 items-center gap-2'>
                  <AlertTriangle
                    className={cn(
                      'size-3.5 shrink-0',
                      issue.severity === 'CRITICAL'
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    )}
                  />
                  <span className='min-w-0 truncate font-semibold'>
                    {issue.message}
                  </span>
                </div>
                <p className='truncate text-muted-foreground'>
                  {formatDiagnosticsIssueContext(issue)}
                </p>
              </div>
            ))}
            {totalIssues > issues.slice(0, 4).length ? (
              <p className='px-1 text-xs text-muted-foreground'>
                {t('productionOutsourcing.execution.diagnostics.moreIssues', {
                  count: totalIssues - issues.slice(0, 4).length,
                })}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function DiagnosticsMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: string
}) {
  return (
    <div className='flex min-h-12 items-center justify-between gap-2 rounded-md bg-background/60 px-3 py-2'>
      <span className='min-w-0 truncate text-xs font-medium text-muted-foreground'>
        {label}
      </span>
      <span className={cn('text-sm font-semibold tabular-nums', tone)}>
        {value}
      </span>
    </div>
  )
}

function ProgressCell({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-md bg-background/60 p-2'>
      <p className='text-xs font-medium text-muted-foreground'>{label}</p>
      <p className='mt-1 text-sm font-semibold tabular-nums'>{value}</p>
    </div>
  )
}

function formatDiagnosticsNumber(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)
}

function formatDiagnosticsTime(value?: string) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleString()
}

function formatDiagnosticsIssueContext(
  issue: OutsourceDiagnosticsResponse['issues'][number]
) {
  const order = issue.orderNo ? issue.orderNo : issue.metadata.logId
  const line = issue.lineNo > 0 ? `#${issue.lineNo}` : ''
  const barcode = issue.productBarcode || issue.metadata.eventKey || issue.type
  return [order, line, barcode].filter(Boolean).join(' · ')
}

function OutsourceExecutionDialog({
  activeAction,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  activeAction: ActiveAction | null
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (
    values: OutsourceTransferFormValues | OutsourceInspectionFormValues
  ) => void
}) {
  const { t } = useLanguage()
  const categoryOptionsQuery = useOutsourceInventoryCategoryOptions()
  const [productBarcode, setProductBarcode] = useState('')
  const [quantity, setQuantity] = useState(() =>
    activeAction
      ? defaultActionQuantity(activeAction.line, activeAction.action)
      : 1
  )
  const [result, setResult] = useState<OutsourceInspectionResult>('PASS')
  const [disposition, setDisposition] =
    useState<OutsourceInspectionDisposition>('ACCEPT')
  const [sourceCategory, setSourceCategory] = useState('')
  const [targetCategory, setTargetCategory] = useState('')
  const [batchNo, setBatchNo] = useState('')
  const [notes, setNotes] = useState('')

  const open = activeAction !== null
  const line = activeAction?.line

  if (!activeAction || !line) {
    return null
  }

  const isInspection = activeAction.action === 'inspect'
  const titleKey =
    `productionOutsourcing.execution.dialog.${activeAction.action}Title` as TranslationKey
  const categoryOptions = categoryOptionsQuery.data ?? []
  const sourceCategoryOptions = categoryOptions.filter(
    (option) =>
      option.allowShipment && option.code !== PRODUCTION_OUTSOURCE_CATEGORY
  )
  const targetCategoryOptions = categoryOptions.filter(
    (option) =>
      option.allowInbound && option.code !== PRODUCTION_OUTSOURCE_CATEGORY
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='md' className='max-w-[calc(100%-0.5rem)]'>
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
          <DialogDescription>
            {activeAction.order.orderNo} ·{' '}
            {line.productName || line.productCode}
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-3'>
          <div className='grid gap-1.5'>
            <span className='text-xs font-medium text-muted-foreground'>
              {t('productionOutsourcing.execution.fields.productBarcode')}
            </span>
            <Input
              value={productBarcode}
              onChange={(event) => setProductBarcode(event.target.value)}
              placeholder={t(
                'productionOutsourcing.execution.placeholders.productBarcode'
              )}
            />
          </div>
          {!isInspection ? (
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='grid gap-1.5'>
                <span className='text-xs font-medium text-muted-foreground'>
                  {t('productionOutsourcing.execution.fields.sourceCategory')}
                </span>
                <select
                  value={
                    activeAction.action === 'send'
                      ? sourceCategory
                      : PRODUCTION_OUTSOURCE_CATEGORY
                  }
                  disabled={activeAction.action === 'return'}
                  onChange={(event) => setSourceCategory(event.target.value)}
                  className='h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 dark:bg-input/30'
                >
                  <option value=''>
                    {t(
                      'productionOutsourcing.execution.placeholders.sourceCategory'
                    )}
                  </option>
                  {activeAction.action === 'send'
                    ? sourceCategoryOptions.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label}
                        </option>
                      ))
                    : null}
                </select>
              </div>
              <div className='grid gap-1.5'>
                <span className='text-xs font-medium text-muted-foreground'>
                  {t('productionOutsourcing.execution.fields.targetCategory')}
                </span>
                <select
                  value={
                    activeAction.action === 'send'
                      ? PRODUCTION_OUTSOURCE_CATEGORY
                      : targetCategory
                  }
                  disabled={activeAction.action === 'send'}
                  onChange={(event) => setTargetCategory(event.target.value)}
                  className='h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 dark:bg-input/30'
                >
                  <option
                    value={
                      activeAction.action === 'send'
                        ? PRODUCTION_OUTSOURCE_CATEGORY
                        : ''
                    }
                  >
                    {activeAction.action === 'send'
                      ? t(
                          'productionOutsourcing.execution.fields.outsourceInProcess'
                        )
                      : t(
                          'productionOutsourcing.execution.placeholders.targetCategory'
                        )}
                  </option>
                  {activeAction.action === 'return'
                    ? targetCategoryOptions.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label}
                        </option>
                      ))
                    : null}
                </select>
              </div>
            </div>
          ) : null}
          {!isInspection ? (
            <div className='grid gap-1.5'>
              <span className='text-xs font-medium text-muted-foreground'>
                {t('productionOutsourcing.execution.fields.batchNo')}
              </span>
              <Input
                value={batchNo}
                onChange={(event) => setBatchNo(event.target.value)}
                placeholder={t(
                  'productionOutsourcing.execution.placeholders.batchNo'
                )}
              />
            </div>
          ) : null}
          <div className='grid gap-1.5'>
            <span className='text-xs font-medium text-muted-foreground'>
              {t('productionOutsourcing.execution.fields.quantity')}
            </span>
            <Input
              type='number'
              min='0'
              step='0.01'
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          </div>
          {isInspection ? (
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='grid gap-1.5'>
                <span className='text-xs font-medium text-muted-foreground'>
                  {t('productionOutsourcing.execution.fields.result')}
                </span>
                <select
                  value={result}
                  onChange={(event) => {
                    const next = event.target.value as OutsourceInspectionResult
                    setResult(next)
                    setDisposition(
                      next === 'FAIL'
                        ? 'REWORK'
                        : next === 'CONDITIONAL'
                          ? 'CONCESSION'
                          : 'ACCEPT'
                    )
                  }}
                  className='h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30'
                >
                  <option value='PASS'>
                    {t('productionOutsourcing.execution.results.PASS')}
                  </option>
                  <option value='CONDITIONAL'>
                    {t('productionOutsourcing.execution.results.CONDITIONAL')}
                  </option>
                  <option value='FAIL'>
                    {t('productionOutsourcing.execution.results.FAIL')}
                  </option>
                </select>
              </div>
              <div className='grid gap-1.5'>
                <span className='text-xs font-medium text-muted-foreground'>
                  {t('productionOutsourcing.execution.fields.disposition')}
                </span>
                <select
                  value={disposition}
                  onChange={(event) =>
                    setDisposition(
                      event.target.value as OutsourceInspectionDisposition
                    )
                  }
                  className='h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30'
                >
                  <option value='ACCEPT'>
                    {t('productionOutsourcing.execution.dispositions.ACCEPT')}
                  </option>
                  <option value='CONCESSION'>
                    {t(
                      'productionOutsourcing.execution.dispositions.CONCESSION'
                    )}
                  </option>
                  <option value='REWORK'>
                    {t('productionOutsourcing.execution.dispositions.REWORK')}
                  </option>
                  <option value='SCRAP'>
                    {t('productionOutsourcing.execution.dispositions.SCRAP')}
                  </option>
                </select>
              </div>
            </div>
          ) : null}
          <div className='grid gap-1.5'>
            <span className='text-xs font-medium text-muted-foreground'>
              {t('productionOutsourcing.execution.fields.notes')}
            </span>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className='min-h-20'
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='rounded-full'
          >
            {t('common.actions.cancel')}
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={() => {
              if (isInspection) {
                onSubmit({
                  productBarcode,
                  result,
                  disposition,
                  inspectedQuantity: quantity,
                  uom: line.uom,
                  inspectedAt: '',
                  notes,
                })
                return
              }
              onSubmit({
                productBarcode,
                quantity,
                uom: line.uom,
                occurredAt: '',
                sourceCategory:
                  activeAction.action === 'send'
                    ? sourceCategory
                    : PRODUCTION_OUTSOURCE_CATEGORY,
                targetCategory:
                  activeAction.action === 'send'
                    ? PRODUCTION_OUTSOURCE_CATEGORY
                    : targetCategory,
                batchNo,
                notes,
              })
            }}
            className='rounded-full'
          >
            {isSubmitting ? (
              <Loader2 className='mr-2 size-4 animate-spin' />
            ) : null}
            {t('common.actions.commit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
