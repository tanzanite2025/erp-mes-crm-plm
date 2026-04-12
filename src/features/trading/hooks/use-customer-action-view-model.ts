import { useMemo } from 'react'
import { type Customer } from '../data/schema'
import type { TranslationKey } from '@/locales'

interface CustomerActionViewModelOptions {
  customer?: Customer | null
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

interface CustomerStatusOption {
  value: Customer['status']
  label: string
}

const DEFAULT_FORM_DATA: Partial<Customer> = {
  name: '',
  code: '',
  contactPerson: '',
  contactPhone: '',
  email: '',
  address: '',
  status: 'Active',
  creditLimit: 0,
  balance: 0,
}

export function useCustomerActionViewModel({ customer, t }: CustomerActionViewModelOptions) {
  const allowedEditStatuses = ['Active', 'Pending']
  const initialFormData = useMemo(() => (customer ? customer : (DEFAULT_FORM_DATA as Customer)), [customer])
  const statusOptions = useMemo<CustomerStatusOption[]>(
    () => [
      { value: 'Active', label: t('trading.customerStatus.active') },
      { value: 'Pending', label: t('trading.customerStatus.pending') },
      { value: 'Inactive', label: t('trading.customerStatus.inactive') },
    ],
    [t]
  )

  return {
    allowedEditStatuses,
    initialFormData,
    statusOptions,
  }
}
