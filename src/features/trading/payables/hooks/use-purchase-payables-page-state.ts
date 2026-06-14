import { useMemo, useState } from 'react'

interface PayableListItemLike {
  id: string
}

interface UsePurchasePayablesPageStateParams<
  TItem extends PayableListItemLike,
> {
  sourceType?: string
  sourceRefId?: string
  autoOpen?: boolean
  items: TItem[]
}

/**
 * 应付页面状态管理 hook — 与 AR 的 useSalesReceivablesPageState 对称。
 * 管理选中的 ledger ID 和 autoOpen 行为。
 */
export function usePurchasePayablesPageState<
  TItem extends PayableListItemLike,
>({
  sourceType,
  sourceRefId,
  autoOpen,
  items,
}: UsePurchasePayablesPageStateParams<TItem>) {
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null)
  const [dismissedAutoOpenKey, setDismissedAutoOpenKey] = useState('')
  const autoOpenKey = useMemo(
    () => `${sourceType ?? ''}:${sourceRefId ?? ''}:${autoOpen ? '1' : '0'}`,
    [autoOpen, sourceRefId, sourceType]
  )
  const autoOpenLedgerId = useMemo(() => {
    if (!autoOpen || dismissedAutoOpenKey === autoOpenKey) {
      return null
    }
    return items[0]?.id ?? null
  }, [autoOpen, autoOpenKey, dismissedAutoOpenKey, items])
  const activeLedgerId = selectedLedgerId ?? autoOpenLedgerId

  const handleSelectPayable = (ledgerId: string) => {
    setSelectedLedgerId(ledgerId)
  }

  const handleDetailOpenChange = (open: boolean) => {
    if (open) {
      return
    }
    if (autoOpenLedgerId) {
      setDismissedAutoOpenKey(autoOpenKey)
    }
    setSelectedLedgerId(null)
  }

  return {
    activeLedgerId,
    handleSelectPayable,
    handleDetailOpenChange,
  }
}
