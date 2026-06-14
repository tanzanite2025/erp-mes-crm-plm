import { useMemo } from 'react'
import { createLogger } from '@/lib/logger'
import { resolveQueryFailure } from '@/lib/read-resource'
import { useTradingFinanceResources } from '../../hooks/use-trading-finance-resources'
import { SettlementLedgerDetailDialog } from '../../settlement-ledger-detail-dialog'
import { salesReceivableDetailDialogConfig } from '../config/sales-receivable-detail-dialog.config'
import {
  useCreateReceiptRecord,
  useReceivableLedgerDetail,
} from '../hooks/use-receivable-ledger-detail'
import {
  useGetReceivables,
  useSearchReceivableLedgers,
} from '../hooks/use-receivables'
import { SalesReceivableSalesReturnAdjustmentSection } from './sales-receivable-sales-return-adjustment-section'

const logger = createLogger('SalesReceivableDetailDialog')

interface SalesReceivableDetailDialogProps {
  open: boolean
  receivableId: string | null
  onOpenChange: (open: boolean) => void
}

export function SalesReceivableDetailDialog({
  open,
  receivableId,
  onOpenChange,
}: SalesReceivableDetailDialogProps) {
  const receivablesQuery = useGetReceivables()
  const detailQuery = useReceivableLedgerDetail(open ? receivableId : null)
  const createMutation = useCreateReceiptRecord()
  const financeResources = useTradingFinanceResources({
    includeCurrencies: true,
    includePaymentMethods: true,
    includePaymentTerms: false,
  })
  const financeResourceStatus =
    financeResources.readResource.status === 'error'
      ? 'error'
      : financeResources.readResource.status === 'loading'
        ? 'loading'
        : 'ready'
  const financeResourceErrorMessage =
    financeResources.readResource.status === 'error'
      ? financeResources.readResource.error.message
      : undefined
  const dialogResource = useMemo(() => {
    if (!open || !receivableId) {
      return { status: 'idle' as const }
    }

    if (detailQuery.readResource.status === 'error') {
      return {
        status: 'error' as const,
        errorMessage: detailQuery.readResource.error.message,
      }
    }

    const ledgerOptionsFailure = resolveQueryFailure({
      data: receivablesQuery.data?.items,
      error: receivablesQuery.error,
      isPending: receivablesQuery.isPending,
      scope: 'SalesReceivableDetailDialog.ledgerOptions',
      missingMessage: '[CRITICAL] Receivable ledger options missing after load',
      failureMessage: '[CRITICAL] Receivable ledger options query failed',
    })
    if (ledgerOptionsFailure) {
      return {
        status: 'error' as const,
        errorMessage: ledgerOptionsFailure.error.message,
      }
    }

    if (
      detailQuery.readResource.status === 'loading' ||
      receivablesQuery.isPending
    ) {
      return { status: 'loading' as const }
    }

    if (detailQuery.readResource.status !== 'ready') {
      return { status: 'idle' as const }
    }

    return {
      status: 'ready' as const,
      detail: detailQuery.readResource.data,
      ledgerOptions: receivablesQuery.data?.items ?? [],
    }
  }, [
    detailQuery.readResource,
    open,
    receivableId,
    receivablesQuery.data?.items,
    receivablesQuery.error,
    receivablesQuery.isPending,
  ])

  return (
    <SettlementLedgerDetailDialog
      key={receivableId ?? 'receivable-empty'}
      open={open}
      ledgerId={receivableId}
      onOpenChange={onOpenChange}
      detail={
        dialogResource.status === 'ready' ? dialogResource.detail : undefined
      }
      records={
        dialogResource.status === 'ready'
          ? dialogResource.detail.receiptRecords
          : []
      }
      allocationHistory={
        dialogResource.status === 'ready'
          ? dialogResource.detail.allocations
          : []
      }
      ledgerOptions={
        dialogResource.status === 'ready' ? dialogResource.ledgerOptions : []
      }
      currencies={financeResources.currencies}
      paymentMethods={financeResources.paymentMethods}
      isCurrencyLoading={financeResources.isLoading}
      financeResourceStatus={financeResourceStatus}
      financeResourceErrorMessage={financeResourceErrorMessage}
      onRetryFinanceResources={() => {
        void financeResources.retry()
      }}
      detailResourceStatus={dialogResource.status}
      detailResourceErrorMessage={
        dialogResource.status === 'error'
          ? dialogResource.errorMessage
          : undefined
      }
      onRetryDetailResource={() => {
        void Promise.all([
          detailQuery.retryRead(),
          receivablesQuery.refetch(),
        ]).catch((error) => {
          logger.error('Failed to retry receivable detail resources', error)
        })
      }}
      isDetailLoading={dialogResource.status === 'loading'}
      isSubmitPending={createMutation.isPending}
      onSubmit={async (payload) => {
        if (!receivableId) {
          return
        }
        await createMutation.mutateAsync({ id: receivableId, payload })
      }}
      extraContent={
        dialogResource.status === 'ready' ? (
          <SalesReceivableSalesReturnAdjustmentSection
            detail={dialogResource.detail}
          />
        ) : null
      }
      useSearchLedgers={useSearchReceivableLedgers}
      config={salesReceivableDetailDialogConfig}
    />
  )
}
