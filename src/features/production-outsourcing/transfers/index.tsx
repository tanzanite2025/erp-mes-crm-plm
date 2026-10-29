import { useMemo, useRef, useState } from 'react'
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
import { useAuthStore } from '@/stores/auth-store'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import {
  industrialPanelClassName,
  industrialPanelGradientClassName,
} from '@/components/uds/industrial-panel'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { getAuthSessionPermissionIds } from '@/features/authz/utils/auth-session'
import { OutsourceStatCard } from '../components/outsource-stat-card'
import type {
  OutsourceDiagnosticsResponse,
  OutsourceInspectionFormValues,
  OutsourceOrder,
  OutsourceOrderLine,
  OutsourceOrderStatus,
  OutsourceTransferFormValues,
} from '../data/outsource-order'
import {
  useOutsourceDiagnostics,
  useOutsourceOrderMutations,
  useOutsourceOrders,
} from '../hooks/use-outsource-orders'
import { OutsourceOrderLineOptionalBarcodeRegistrationDialog } from './outsource-order-line-optional-barcode-registration-dialog'
import {
  OutsourceSelectedOrderLineBarcodeReviewAndExplicitBusinessExecutionDialog,
  type SelectedOutsourceOrderLineExecution,
} from './outsource-selected-order-line-barcode-review-and-explicit-send-return-inspection-dialog'

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

function quantityText(value: number, uom: string) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)} ${uom}`
}

export function OutsourceTransferManagement() {
  const user = useAuthStore((state) => state.user)
  return (
    <OutsourceTransferExecutionWorkspace
      key={`${user?.id}:${getAuthSessionPermissionIds(user).join('|')}`}
    />
  )
}

function OutsourceTransferExecutionWorkspace() {
  const { t } = useLanguage()
  const { allowsAction, isChecking } = usePermissionActions()
  const [search, setSearch] = useState('')
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false)
  const [activeAction, setActiveAction] =
    useState<SelectedOutsourceOrderLineExecution | null>(null)
  const [barcodeRegistrationLine, setBarcodeRegistrationLine] = useState<{
    order: OutsourceOrder
    line: OutsourceOrderLine
  } | null>(null)
  const executionSubmissionLockRef = useRef(false)
  const ordersQuery = useOutsourceOrders({ search, status: 'ALL' })
  const { sendLineMutation, returnLineMutation, inspectLineMutation } =
    useOutsourceOrderMutations()
  const orders = ordersQuery.data?.items
  const canTransfer = allowsAction('action_outsource_transfer_execute')
  const canInspect = allowsAction('action_outsource_inspection_submit')
  const canRegisterBarcodes =
    canTransfer || allowsAction('action_outsource_order_manage')
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
        className='p-3 md:p-3 [&_p]:text-sm [&_p]:font-normal [&_p]:tracking-normal [&_p]:opacity-100'
        icon={ScanLine}
        title={t('productionOutsourcing.execution.title')}
        description={t('productionOutsourcing.execution.description')}
      />

      <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
        <OutsourceStatCard
          label={t('productionOutsourcing.execution.stats.releasedLines')}
          value={stats.released}
          className='py-0 sm:py-0'
        />
        <OutsourceStatCard
          label={t('productionOutsourcing.execution.stats.sent')}
          value={stats.sent}
          className='bg-blue-500/5 py-0 sm:py-0'
          labelClassName='text-blue-600'
          valueClassName='text-blue-600'
        />
        <OutsourceStatCard
          label={t('productionOutsourcing.execution.stats.returned')}
          value={stats.returned}
          className='bg-violet-500/5 py-0 sm:py-0'
          labelClassName='text-violet-600'
          valueClassName='text-violet-600'
        />
        <OutsourceStatCard
          label={t('productionOutsourcing.execution.stats.pendingInspection')}
          value={stats.pendingInspection}
          className='bg-amber-500/5 py-0 sm:py-0'
          labelClassName='text-amber-600'
          valueClassName='text-amber-600'
        />
      </div>

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
      ) : ordersQuery.isError ? (
        <p role='alert' className='text-sm text-destructive'>
          {t('productionOutsourcing.orders.loadingFailed')}:{' '}
          {ordersQuery.error.message}
        </p>
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
        <div
          className={cn(
            'grid gap-4',
            executionOrders.length > 1 && 'xl:grid-cols-2'
          )}
        >
          {executionOrders.map((order) => (
            <Card
              key={order.id}
              className={cn(industrialPanelClassName, 'gap-0 py-0')}
            >
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
                          disabled={isChecking || isSubmitting}
                          onClick={() =>
                            setBarcodeRegistrationLine({ order, line })
                          }
                        >
                          <ScanLine className='mr-2 size-3.5' />
                          {t(
                            'productionOutsourcing.barcodeRegistration.entry',
                            { count: line.registeredProductBarcodes.length }
                          )}
                        </Button>
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

      <details
        className='rounded-md border p-3'
        onToggle={(event) => setIsDiagnosticsOpen(event.currentTarget.open)}
      >
        <summary className='cursor-pointer text-sm text-muted-foreground'>
          {t('productionOutsourcing.execution.diagnostics.title')}
        </summary>
        {isDiagnosticsOpen && <OutsourceDiagnosticsPanel />}
      </details>

      <OutsourceSelectedOrderLineBarcodeReviewAndExplicitBusinessExecutionDialog
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
          if (!activeAction || executionSubmissionLockRef.current) {
            return
          }
          if (!values.productBarcode.trim()) {
            toast.error(t('productionOutsourcing.execution.validation.barcode'))
            return
          }
          if (activeAction.action === 'inspect') {
            executionSubmissionLockRef.current = true
            inspectLineMutation.mutate(
              {
                lineId: activeAction.line.id,
                values: values as OutsourceInspectionFormValues,
              },
              {
                onSuccess: () => setActiveAction(null),
                onSettled: () => {
                  executionSubmissionLockRef.current = false
                },
              }
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
          executionSubmissionLockRef.current = true
          mutation.mutate(
            {
              lineId: activeAction.line.id,
              values: transferValues,
            },
            {
              onSuccess: () => setActiveAction(null),
              onSettled: () => {
                executionSubmissionLockRef.current = false
              },
            }
          )
        }}
      />
      {barcodeRegistrationLine && (
        <OutsourceOrderLineOptionalBarcodeRegistrationDialog
          key={barcodeRegistrationLine.line.id}
          order={barcodeRegistrationLine.order}
          line={barcodeRegistrationLine.line}
          canEdit={
            canRegisterBarcodes &&
            barcodeRegistrationLine.order.status !== 'CLOSED'
          }
          onClose={() => setBarcodeRegistrationLine(null)}
        />
      )}
    </div>
  )
}

function OutsourceDiagnosticsPanel() {
  const { t } = useLanguage()
  const {
    data: diagnostics,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useOutsourceDiagnostics()
  const summary = isError ? undefined : diagnostics?.summary
  const issues = isError ? [] : (diagnostics?.issues ?? [])
  const totalIssues = summary?.totalIssues ?? 0
  const hasCritical = (summary?.criticalIssues ?? 0) > 0
  const statusTone = isError
    ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
    : !summary
      ? 'border-muted bg-muted text-muted-foreground'
      : hasCritical
        ? 'border-rose-500/30 bg-rose-500/10 text-rose-600'
        : totalIssues > 0
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
  const StatusIcon = isLoading
    ? Loader2
    : isError || totalIssues > 0
      ? AlertTriangle
      : CheckCircle2
  const generatedAt = formatDiagnosticsTime(
    isError ? undefined : diagnostics?.generatedAt
  )

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
              <p
                role={isError ? 'alert' : undefined}
                className='text-xs text-muted-foreground'
              >
                {isError
                  ? t('productionOutsourcing.execution.diagnostics.loadFailed')
                  : isLoading || !summary
                    ? t('productionOutsourcing.execution.diagnostics.loading')
                    : totalIssues > 0
                      ? t(
                          'productionOutsourcing.execution.diagnostics.statusIssues',
                          { count: totalIssues }
                        )
                      : t(
                          'productionOutsourcing.execution.diagnostics.statusOk'
                        )}
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
            onClick={() => void refetch()}
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
