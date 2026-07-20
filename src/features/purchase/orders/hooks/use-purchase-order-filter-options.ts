import { type PurchaseOrderListItem } from '../data/schema'
import { useFinanceFilterOptions } from '@/features/finance/hooks/use-finance-resources'

export function usePurchaseOrderFilterOptions(orders: PurchaseOrderListItem[]) {
  return useFinanceFilterOptions(orders)
}
