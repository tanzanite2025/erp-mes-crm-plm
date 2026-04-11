import { type Currency } from '@/features/finance/data/schema'
import { type PurchaseOrder } from '../data/schema'

export type PurchaseOrderFieldValue = PurchaseOrder[keyof PurchaseOrder]

export function normalizePurchaseOrderCurrencyValue(value: PurchaseOrderFieldValue): string {
  return typeof value === 'string' ? value : String(value ?? '')
}

export function resolvePurchaseOrderExchangeRate(currencies: Currency[], currencyCode: string, fallbackRate?: number): number | undefined {
  const matchedCurrency = currencies.find((currency) => currency.code === currencyCode)
  return matchedCurrency?.rate ?? fallbackRate
}

export function buildPurchaseOrderHeaderPatch(
  field: keyof PurchaseOrder,
  value: PurchaseOrderFieldValue
): Partial<PurchaseOrder> {
  return {
    [field]: value,
  } as Partial<PurchaseOrder>
}

export function buildPurchaseOrderCurrencyPatch(
  currencyCode: string,
  exchangeRate?: number
): Partial<PurchaseOrder> {
  return {
    currency: currencyCode,
    ...(exchangeRate === undefined ? {} : { exchangeRate }),
  }
}
