import { SettlementLedgerDetailDialog } from '../../settlement-ledger-detail-dialog'
import { useTradingFinanceResources } from '../../hooks/use-trading-finance-resources'
import { purchasePayableDetailDialogConfig } from '../config/purchase-payable-detail-dialog.config'
import { useCreatePaymentRecord, usePayableLedgerDetail } from '../hooks/use-payable-ledger-detail'
import { useGetPayables, useSearchPayableLedgers } from '../hooks/use-payables'

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
  const detail = detailQuery.data

  return (
    <SettlementLedgerDetailDialog
      key={ledgerId ?? 'payable-empty'}
      open={open}
      ledgerId={ledgerId}
      onOpenChange={onOpenChange}
      detail={detail}
      records={detail?.paymentRecords ?? []}
      allocationHistory={detail?.allocations ?? []}
      ledgerOptions={payablesQuery.data?.items ?? []}
      currencies={financeResources.currencies}
      paymentMethods={financeResources.paymentMethods}
      isCurrencyLoading={financeResources.isLoading}
      isDetailLoading={detailQuery.isLoading}
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
