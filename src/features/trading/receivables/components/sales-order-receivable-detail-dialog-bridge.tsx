import { useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { SalesReceivableDetailDialog } from './sales-receivable-detail-dialog'
import { useGetReceivables } from '../hooks/use-receivables'

interface SalesOrderReceivableDetailDialogBridgeProps {
  open: boolean
  orderId: string | null
  onOpenChange: (open: boolean) => void
}

export function SalesOrderReceivableDetailDialogBridge({
  open,
  orderId,
  onOpenChange,
}: SalesOrderReceivableDetailDialogBridgeProps) {
  const { t } = useLanguage()
  const receivablesQuery = useGetReceivables(
    open && orderId
      ? {
          sourceType: 'SALES_ORDER',
          sourceRefId: orderId,
        }
      : {},
    {
      enabled: open && Boolean(orderId),
    }
  )
  const receivableId = useMemo(
    () => receivablesQuery.data?.items[0]?.id ?? null,
    [receivablesQuery.data?.items]
  )

  useEffect(() => {
    if (!open || !orderId || !receivablesQuery.isError) {
      return
    }
    toast.error(t('trading.receivables.orderDialog.loadFailed'))
    onOpenChange(false)
  }, [onOpenChange, open, orderId, receivablesQuery.isError, t])

  useEffect(() => {
    if (
      !open ||
      !orderId ||
      receivablesQuery.isPending ||
      receivablesQuery.isFetching ||
      receivablesQuery.isError ||
      !receivablesQuery.data
    ) {
      return
    }

    if (!receivableId) {
      toast.warning(t('trading.receivables.orderDialog.noLedger'))
      onOpenChange(false)
    }
  }, [
    onOpenChange,
    open,
    orderId,
    receivableId,
    receivablesQuery.data,
    receivablesQuery.isError,
    receivablesQuery.isFetching,
    receivablesQuery.isPending,
    t,
  ])

  return (
    <SalesReceivableDetailDialog
      open={open && Boolean(receivableId)}
      receivableId={receivableId}
      onOpenChange={onOpenChange}
    />
  )
}
