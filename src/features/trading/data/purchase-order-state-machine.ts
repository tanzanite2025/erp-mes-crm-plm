export type PurchaseOrderStatus =
  | 'Draft'
  | 'Sent'
  | 'Awaiting'
  | 'Received'
  | 'Canceled'

export type PurchaseOrderAction =
  | 'save'
  | 'send'
  | 'confirmReceipt'
  | 'createReturn'
  | 'cancel'

export interface PurchaseOrderStateDefinition {
  status: PurchaseOrderStatus
  phase: 'draft' | 'active' | 'pending' | 'done' | 'cancelled'
  isTerminal: boolean
  defaultResolve: boolean
}

export const purchaseOrderStateCatalog: PurchaseOrderStateDefinition[] = [
  { status: 'Draft', phase: 'draft', isTerminal: false, defaultResolve: false },
  { status: 'Sent', phase: 'active', isTerminal: false, defaultResolve: false },
  {
    status: 'Awaiting',
    phase: 'pending',
    isTerminal: false,
    defaultResolve: false,
  },
  { status: 'Received', phase: 'done', isTerminal: true, defaultResolve: true },
  {
    status: 'Canceled',
    phase: 'cancelled',
    isTerminal: true,
    defaultResolve: true,
  },
]

const knownStatuses = new Set<PurchaseOrderStatus>(
  purchaseOrderStateCatalog.map((item) => item.status)
)

export function normalizePurchaseOrderStatus(
  status: string
): PurchaseOrderStatus {
  const trimmed = status.trim()
  if (knownStatuses.has(trimmed as PurchaseOrderStatus)) {
    return trimmed as PurchaseOrderStatus
  }

  throw new Error(`Invalid purchase order status: ${status}`)
}

export function isPurchaseOrderTerminalStatus(
  status: PurchaseOrderStatus
): boolean {
  return status === 'Received' || status === 'Canceled'
}

export function canTransitionPurchaseOrderStatus(
  current: PurchaseOrderStatus,
  target: PurchaseOrderStatus
): boolean {
  if (current === target) return false

  switch (current) {
    case 'Draft':
      return target === 'Sent' || target === 'Canceled'
    case 'Sent':
      return (
        target === 'Awaiting' || target === 'Received' || target === 'Canceled'
      )
    case 'Awaiting':
      return target === 'Received' || target === 'Canceled'
    default:
      return false
  }
}

export function canPerformPurchaseOrderAction(
  status: PurchaseOrderStatus,
  action: PurchaseOrderAction
): boolean {
  switch (action) {
    case 'save':
      return status === 'Draft'
    case 'send':
      return canTransitionPurchaseOrderStatus(status, 'Sent')
    case 'confirmReceipt':
    case 'createReturn':
      return status === 'Sent' || status === 'Awaiting'
    case 'cancel':
      return status === 'Draft' || status === 'Sent' || status === 'Awaiting'
    default:
      return false
  }
}
