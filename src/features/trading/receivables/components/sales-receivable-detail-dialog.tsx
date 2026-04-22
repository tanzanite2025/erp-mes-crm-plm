import { SettlementLedgerDetailDialog } from '../../settlement-ledger-detail-dialog'
import { useTradingFinanceResources } from '../../hooks/use-trading-finance-resources'
import { salesReceivableDetailDialogConfig } from '../config/sales-receivable-detail-dialog.config'
import { useCreateReceiptRecord, useReceivableLedgerDetail } from '../hooks/use-receivable-ledger-detail'
import { useGetReceivables, useSearchReceivableLedgers } from '../hooks/use-receivables'

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
  const detail = detailQuery.data

  return (
    <SettlementLedgerDetailDialog
      key={receivableId ?? 'receivable-empty'}
      open={open}
      ledgerId={receivableId}
      onOpenChange={onOpenChange}
      detail={detail}
      records={detail?.receiptRecords ?? []}
      allocationHistory={detail?.allocations ?? []}
      ledgerOptions={receivablesQuery.data?.items ?? []}
      currencies={financeResources.currencies}
      paymentMethods={financeResources.paymentMethods}
      isCurrencyLoading={financeResources.isLoading}
      isDetailLoading={detailQuery.isLoading}
      isSubmitPending={createMutation.isPending}
      onSubmit={async (payload) => {
        if (!receivableId) {
          return
        }
        await createMutation.mutateAsync({ id: receivableId, payload })
      }}
      useSearchLedgers={useSearchReceivableLedgers}
      config={salesReceivableDetailDialogConfig}
    />
  )
}
