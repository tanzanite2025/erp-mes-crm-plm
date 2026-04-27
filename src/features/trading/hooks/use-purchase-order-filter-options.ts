import { useTradingFinanceFilterOptions } from './use-trading-finance-resources'
import { type PurchaseOrderListItem } from '../data/schema'

export function usePurchaseOrderFilterOptions(orders: PurchaseOrderListItem[]) {
  return useTradingFinanceFilterOptions(orders)
}
