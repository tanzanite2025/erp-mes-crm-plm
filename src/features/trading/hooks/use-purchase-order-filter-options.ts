import { type PurchaseOrderListItem } from '../data/schema'
import { useTradingFinanceFilterOptions } from './use-trading-finance-resources'

export function usePurchaseOrderFilterOptions(orders: PurchaseOrderListItem[]) {
  return useTradingFinanceFilterOptions(orders)
}
