import { useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { useGetPayables } from '../hooks/use-payables'
import { PurchasePayableDetailDialog } from './purchase-payable-detail-dialog'

interface PurchaseOrderPayableDetailDialogBridgeProps {
  open: boolean
  orderId: string | null
  onOpenChange: (open: boolean) => void
}

export function PurchaseOrderPayableDetailDialogBridge({
  open,
  orderId,
  onOpenChange,
}: PurchaseOrderPayableDetailDialogBridgeProps) {
  const { t } = useLanguage()
  const payablesQuery = useGetPayables(
    open && orderId
      ? {
          sourceType: 'PURCHASE_ORDER',
          sourceRefId: orderId,
        }
      : {},
    {
      enabled: open && Boolean(orderId),
    }
  )
  const ledgerId = useMemo(
    () => payablesQuery.data?.items[0]?.id ?? null,
    [payablesQuery.data?.items]
  )

  useEffect(() => {
    if (!open || !orderId || !payablesQuery.isError) {
      return
    }
    toast.error(t('purchase.payables.orderDialog.loadFailed'))
    onOpenChange(false)
  }, [onOpenChange, open, orderId, payablesQuery.isError, t])

  useEffect(() => {
    if (
      !open ||
      !orderId ||
      payablesQuery.isPending ||
      payablesQuery.isFetching ||
      payablesQuery.isError ||
      !payablesQuery.data
    ) {
      return
    }

    if (!ledgerId) {
      toast.warning(t('purchase.payables.orderDialog.noLedger'))
      onOpenChange(false)
    }
  }, [
    onOpenChange,
    open,
    orderId,
    ledgerId,
    payablesQuery.data,
    payablesQuery.isError,
    payablesQuery.isFetching,
    payablesQuery.isPending,
    t,
  ])

  return (
    <PurchasePayableDetailDialog
      open={open && Boolean(ledgerId)}
      ledgerId={ledgerId}
      onOpenChange={onOpenChange}
    />
  )
}
