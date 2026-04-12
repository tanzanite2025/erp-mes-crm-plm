import { useCallback, useMemo } from 'react'
import { type Customer, type SalesOrder } from '../data/schema'
import type { AppLocale } from '@/locales'
import {
  getSalesOrderClassificationOptions,
  getSalesOrderTypeOptions,
} from '../data/sales-order-options'

type SalesOrderFormState = Partial<SalesOrder>
type SalesOrderFormUpdater = SalesOrderFormState | ((prev: SalesOrderFormState) => SalesOrderFormState)

interface PaymentOption {
  code: string
  name: string
}

interface SalesOrderHeaderFieldsViewModelOptions {
  locale: AppLocale
  customers: Customer[]
  paymentMethods: PaymentOption[]
  paymentTerms: PaymentOption[]
  setFormData: (value: SalesOrderFormUpdater) => void
}

export function useSalesOrderHeaderFieldsViewModel({
  locale,
  customers,
  paymentMethods,
  paymentTerms,
  setFormData,
}: SalesOrderHeaderFieldsViewModelOptions) {
  const typeOptions = useMemo(() => getSalesOrderTypeOptions(locale), [locale])
  const classificationOptions = useMemo(() => getSalesOrderClassificationOptions(locale), [locale])
  const customerOptions = useMemo(
    () => customers.map((customer) => ({ label: customer.name, value: customer.name, id: customer.id })),
    [customers]
  )
  const paymentMethodOptions = useMemo(
    () => paymentMethods.map((method) => ({ label: method.name, value: method.code })),
    [paymentMethods]
  )
  const paymentTermOptions = useMemo(
    () => paymentTerms.map((term) => ({ label: term.name, value: term.code })),
    [paymentTerms]
  )

  const handleCustomerChange = useCallback(
    (value: string) => {
      const customer = customers.find((item) => item.name === value)
      setFormData((prev) => ({
        ...prev,
        customerName: value,
        customerId: customer?.id,
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

  return {
    typeOptions,
    classificationOptions,
    customerOptions,
    paymentMethodOptions,
    paymentTermOptions,
    handleCustomerChange,
    handlePaymentMethodChange,
    handlePaymentTermChange,
  }
}
