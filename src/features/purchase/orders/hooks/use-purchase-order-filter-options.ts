import { useFinanceFilterOptions } from '@/features/finance/hooks/use-finance-resources'
import { type PurchaseOrderListItem } from '../data/schema'

export function usePurchaseOrderFilterOptions(orders: PurchaseOrderListItem[]) {
  return useFinanceFilterOptions(orders)
}
