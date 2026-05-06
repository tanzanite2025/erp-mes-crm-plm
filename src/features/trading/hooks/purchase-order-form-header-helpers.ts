import { type Currency } from '@/features/finance/data/schema'
import { type PurchaseOrder } from '../data/schema'

export type PurchaseOrderFieldValue = PurchaseOrder[keyof PurchaseOrder]
export type PurchaseOrderStateUpdater = (current: PurchaseOrder) => PurchaseOrder

export function normalizePurchaseOrderCurrencyValue(value: PurchaseOrderFieldValue): string {
  return typeof value === 'string' ? value : String(value ?? '')
}

export function resolvePurchaseOrderExchangeRate(currencies: Currency[], currencyCode: string, fallbackRate?: number): number | undefined {
  const matchedCurrency = currencies.find((currency) => currency.code === currencyCode)
  return matchedCurrency?.rate ?? fallbackRate
}

export function buildPurchaseOrderHeaderStateUpdater(
  field: keyof PurchaseOrder,
  value: PurchaseOrderFieldValue
): PurchaseOrderStateUpdater {
  return (current) => ({
    ...current,
    [field]: value,
  })
}

export function buildPurchaseOrderCurrencyStateUpdater(
  currencyCode: string,
  exchangeRate?: number
): PurchaseOrderStateUpdater {
  return (current) => ({
    ...current,
    currency: currencyCode,
    ...(exchangeRate !== undefined ? { exchangeRate } : {}),
  })
}
