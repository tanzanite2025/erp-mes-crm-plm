import { useMemo } from 'react'
import { createLogger } from '@/lib/logger'
import { resolveQueryFailure } from '@/lib/read-resource'
import { SettlementLedgerDetailDialog } from '../../settlement-ledger-detail-dialog'
import { useTradingFinanceResources } from '../../hooks/use-trading-finance-resources'
import { purchasePayableDetailDialogConfig } from '../config/purchase-payable-detail-dialog.config'
import { useCreatePaymentRecord, usePayableLedgerDetail } from '../hooks/use-payable-ledger-detail'
import { useGetPayables, useSearchPayableLedgers } from '../hooks/use-payables'

const logger = createLogger('PurchasePayableDetailDialog')

interface PurchasePayableDetailDialogProps {
  open: boolean
  ledgerId: string | null
  onOpenChange: (open: boolean) => void
}

export function PurchasePayableDetailDialog({
  open,
  ledgerId,
  onOpenChange,
}: PurchasePayableDetailDialogProps) {
  const payablesQuery = useGetPayables()
  const detailQuery = usePayableLedgerDetail(open ? ledgerId : null)
  const createMutation = useCreatePaymentRecord()
  const financeResources = useTradingFinanceResources({
    includeCurrencies: true,
    includePaymentMethods: false,
    includePaymentTerms: false,
  })
  const financeResourceStatus = financeResources.readResource.status === 'error'
    ? 'error'
    : financeResources.readResource.status === 'loading'
      ? 'loading'
      : 'ready'
  const financeResourceErrorMessage = financeResources.readResource.status === 'error'
    ? financeResources.readResource.error.message
    : undefined
  const dialogResource = useMemo(() => {
    if (!open || !ledgerId) {
      return { status: 'idle' as const }
    }

    if (detailQuery.readResource.status === 'error') {
      return {
        status: 'error' as const,
        errorMessage: detailQuery.readResource.error.message,
      }
    }

    const ledgerOptionsFailure = resolveQueryFailure({
      data: payablesQuery.data?.items,
      error: payablesQuery.error,
      isPending: payablesQuery.isPending,
      scope: 'PurchasePayableDetailDialog.ledgerOptions',
      missingMessage: '[CRITICAL] Payable ledger options missing after load',
      failureMessage: '[CRITICAL] Payable ledger options query failed',
    })
    if (ledgerOptionsFailure) {
      return {
        status: 'error' as const,
        errorMessage: ledgerOptionsFailure.error.message,
      }
    }

    if (detailQuery.readResource.status === 'loading' || payablesQuery.isPending) {
      return { status: 'loading' as const }
    }

    if (detailQuery.readResource.status !== 'ready') {
      return { status: 'idle' as const }
    }

    return {
      status: 'ready' as const,
      detail: detailQuery.readResource.data,
      ledgerOptions: payablesQuery.data?.items ?? [],
    }
  }, [detailQuery.readResource, ledgerId, open, payablesQuery.data?.items, payablesQuery.error, payablesQuery.isPending])

  return (
    <SettlementLedgerDetailDialog
      key={ledgerId ?? 'payable-empty'}
      open={open}
      ledgerId={ledgerId}
      onOpenChange={onOpenChange}
      detail={dialogResource.status === 'ready' ? dialogResource.detail : undefined}
      records={dialogResource.status === 'ready' ? dialogResource.detail.paymentRecords : []}
      allocationHistory={dialogResource.status === 'ready' ? dialogResource.detail.allocations : []}
      ledgerOptions={dialogResource.status === 'ready' ? dialogResource.ledgerOptions : []}
      currencies={financeResources.currencies}
      paymentMethods={financeResources.paymentMethods}
      isCurrencyLoading={financeResources.isLoading}
      financeResourceStatus={financeResourceStatus}
      financeResourceErrorMessage={financeResourceErrorMessage}
      onRetryFinanceResources={() => {
        void financeResources.retry()
      }}
      detailResourceStatus={dialogResource.status}
      detailResourceErrorMessage={dialogResource.status === 'error' ? dialogResource.errorMessage : undefined}
      onRetryDetailResource={() => {
        void Promise.all([detailQuery.retryRead(), payablesQuery.refetch()]).catch((error) => {
          logger.error('Failed to retry payable detail resources', error)
        })
      }}
      isDetailLoading={dialogResource.status === 'loading'}
      isSubmitPending={createMutation.isPending}
      onSubmit={async (payload) => {
        if (!ledgerId) {
          return
        }
        await createMutation.mutateAsync({ id: ledgerId, payload })
      }}
      useSearchLedgers={useSearchPayableLedgers}
      config={purchasePayableDetailDialogConfig}
    />
  )
}
