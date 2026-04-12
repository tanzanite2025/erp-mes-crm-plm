import { useTradingFinanceFilterOptions } from './use-trading-finance-resources'
import { type PurchaseOrder } from '../data/schema'

export function usePurchaseOrderFilterOptions(orders: PurchaseOrder[]) {
  return useTradingFinanceFilterOptions(orders)
}
