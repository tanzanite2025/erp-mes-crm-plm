import { useCallback, useMemo } from 'react'
import type { AppLocale } from '@/locales'
import {
  getSalesOrderClassificationOptions,
  getSalesOrderTypeOptions,
} from '../data/sales-order-options'
import { type Customer, type SalesOrderDraft } from '../data/schema'

type SalesOrderFormState = SalesOrderDraft
type SalesOrderFormUpdater =
  | SalesOrderFormState
  | ((prev: SalesOrderFormState) => SalesOrderFormState)

interface PaymentOption {
  code: string
  name: string
}

interface CurrencyOption {
  code: string
  name: string
  rate?: number
  status?: 'Active' | 'Inactive'
}

interface SalesOrderHeaderFieldsViewModelOptions {
  locale: AppLocale
  customers: Customer[]
  currencies?: CurrencyOption[]
  currentCurrency?: string
  currentCustomerId?: string
  currentCustomerName?: string
  paymentMethods: PaymentOption[]
  paymentTerms: PaymentOption[]
  setFormData: (value: SalesOrderFormUpdater) => void
}

export function useSalesOrderHeaderFieldsViewModel({
  locale,
  customers,
  currencies = [],
  currentCurrency,
  currentCustomerId,
  currentCustomerName,
  paymentMethods,
  paymentTerms,
  setFormData,
}: SalesOrderHeaderFieldsViewModelOptions) {
  const typeOptions = useMemo(() => getSalesOrderTypeOptions(locale), [locale])
  const classificationOptions = useMemo(
    () => getSalesOrderClassificationOptions(locale),
    [locale]
  )
  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        label: customer.name,
        value: customer.id,
        id: customer.id,
      })),
    [customers]
  )
  const selectedCustomerId = useMemo(() => {
    if (currentCustomerId) return currentCustomerId
    return (
      customers.find((customer) => customer.name === currentCustomerName)?.id ??
      ''
    )
  }, [currentCustomerId, currentCustomerName, customers])
  const paymentMethodOptions = useMemo(
    () =>
      paymentMethods.map((method) => ({
        label: method.name,
        value: method.code,
      })),
    [paymentMethods]
  )
  const paymentTermOptions = useMemo(
    () => paymentTerms.map((term) => ({ label: term.name, value: term.code })),
    [paymentTerms]
  )
  const currencyOptions = useMemo(() => {
    const options = currencies
      .filter(
        (currency) =>
          currency.status !== 'Inactive' || currency.code === currentCurrency
      )
      .map((currency) => ({
        label: `${currency.name} (${currency.code})`,
        value: currency.code,
      }))

    if (
      currentCurrency &&
      !options.some((option) => option.value === currentCurrency)
    ) {
      options.push({ label: currentCurrency, value: currentCurrency })
    }

    return options
  }, [currencies, currentCurrency])

  const handleCustomerChange = useCallback(
    (value: string) => {
      const customer =
        customers.find((item) => item.id === value) ??
        customers.find((item) => item.name === value)
      setFormData((prev) => ({
        ...prev,
        customerName: customer?.name || '',
        customerId: customer?.id || '',
      }))
    },
    [customers, setFormData]
  )

  const handlePaymentMethodChange = useCallback(
    (value: string) => {
      const selected = paymentMethods.find((item) => item.code === value)
      setFormData((prev) => ({
        ...prev,
        paymentMethod: value,
        paymentMethodName: selected?.name || '',
      }))
    },
    [paymentMethods, setFormData]
  )

  const handlePaymentTermChange = useCallback(
    (value: string) => {
      const selected = paymentTerms.find((item) => item.code === value)
      setFormData((prev) => ({
        ...prev,
        paymentTerm: value,
        paymentTermName: selected?.name || '',
      }))
    },
    [paymentTerms, setFormData]
  )

  const handleCurrencyChange = useCallback(
    (value: string) => {
      const selected = currencies.find((currency) => currency.code === value)
      const exchangeRateSnapshot =
        typeof selected?.rate === 'number' &&
        Number.isFinite(selected.rate) &&
        selected.rate > 0
          ? selected.rate
          : 1
      setFormData((prev) => ({
        ...prev,
        currency: value,
        exchangeRateSnapshot,
      }))
    },
    [currencies, setFormData]
  )

  return {
    typeOptions,
    classificationOptions,
    customerOptions,
    selectedCustomerId,
    currencyOptions,
    paymentMethodOptions,
    paymentTermOptions,
    handleCustomerChange,
    handleCurrencyChange,
    handlePaymentMethodChange,
    handlePaymentTermChange,
  }
}
