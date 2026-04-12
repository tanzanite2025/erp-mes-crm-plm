import { useCallback, useMemo } from 'react'
import { type OrderEvidence, type PurchaseOrder, type Supplier } from '../data/schema'
import { getPurchaseStatusDisplayMeta } from '../data/purchase-status'

type PurchaseOrderFieldValue = PurchaseOrder[keyof PurchaseOrder]

interface CurrencyOption {
  code: string
  name: string
  rate?: number
  isBase?: boolean
}

interface PaymentOption {
  code: string
  name: string
}

interface PurchaseOrderHeaderViewModelOptions {
  formData: Partial<PurchaseOrder>
  suppliers: Supplier[]
  currencies: CurrencyOption[]
  paymentMethods: PaymentOption[]
  paymentTerms: PaymentOption[]
  t: (key: string, vars?: Record<string, string | number>) => string
  handleHeaderChange: (field: keyof PurchaseOrder, value: PurchaseOrderFieldValue) => void
  onEvidencesChange: (evidences: OrderEvidence[]) => void
}

export function usePurchaseOrderHeaderViewModel({
  formData,
  suppliers,
  currencies,
  paymentMethods,
  paymentTerms,
  t,
  handleHeaderChange,
}: PurchaseOrderHeaderViewModelOptions) {
  const supplierOptions = useMemo(
    () => suppliers.map((supplier) => ({ label: supplier.name, value: supplier.id })),
    [suppliers]
  )

  const currencyOptions = useMemo(
    () =>
      currencies.map((currency) => ({
        label: `${currency.name} (${currency.code})`,
        value: currency.code,
      })),
    [currencies]
  )

  const paymentTermOptions = useMemo(
    () =>
      paymentTerms.map((paymentTerm) => ({
        label: paymentTerm.name,
        value: paymentTerm.code,
      })),
    [paymentTerms]
  )

  const paymentMethodOptions = useMemo(
    () =>
      paymentMethods.map((paymentMethod) => ({
        label: paymentMethod.name,
        value: paymentMethod.code,
      })),
    [paymentMethods]
  )

  const baseCurrency = currencies.find((currency) => currency.isBase) ?? null
  const selectedCurrency = currencies.find((currency) => currency.code === formData.currency) ?? null
  const baseCurrencyCode = baseCurrency?.code || 'CNY'
  const selectedCurrencyCode = formData.currency || selectedCurrency?.code || baseCurrencyCode
  const effectiveExchangeRate =
    typeof formData.exchangeRate === 'number' && Number.isFinite(formData.exchangeRate)
      ? formData.exchangeRate
      : selectedCurrency?.rate ?? 1
  const exchangeRateText =
    selectedCurrencyCode === baseCurrencyCode
      ? t('purchase.orders.headerFields.exchangeRateBaseLocked', {
          currency: selectedCurrencyCode,
        })
      : t('purchase.orders.headerFields.exchangeRatePair', {
          currency: selectedCurrencyCode,
          rate: effectiveExchangeRate.toFixed(4),
          base: baseCurrencyCode,
        })

  const statusMeta = getPurchaseStatusDisplayMeta(formData.status || 'Draft', t)

  const handleSupplierChange = useCallback(
    (value: string) => {
      const supplier = suppliers.find((item) => item.id === value)
      if (!supplier) return
      handleHeaderChange('supplierId', value)
      handleHeaderChange('supplierName', supplier.name)
    },
    [handleHeaderChange, suppliers]
  )

  const handlePaymentMethodChange = useCallback(
    (value: string) => {
      const selected = paymentMethods.find((item) => item.code === value)
      handleHeaderChange('paymentMethod', value)
      handleHeaderChange('paymentMethodName', selected?.name ?? '')
    },
    [handleHeaderChange, paymentMethods]
  )

  const handlePaymentTermChange = useCallback(
    (value: string) => {
      const selected = paymentTerms.find((item) => item.code === value)
      handleHeaderChange('paymentTerm', value)
      handleHeaderChange('paymentTermName', selected?.name ?? '')
    },
    [handleHeaderChange, paymentTerms]
  )

  return {
    supplierOptions,
    currencyOptions,
    paymentTermOptions,
    paymentMethodOptions,
    baseCurrencyCode,
    selectedCurrencyCode,
    effectiveExchangeRate,
    exchangeRateText,
    statusMeta,
    handleSupplierChange,
    handlePaymentMethodChange,
    handlePaymentTermChange,
  }
}
