import { useMemo } from 'react'
import { type Customer, type CustomerFormValues } from '../data/schema'
import type { TranslationKey } from '@/locales'

interface CustomerActionViewModelOptions {
  customer?: Customer | null
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

interface CustomerStatusOption {
  value: Customer['status']
  label: string
}

const DEFAULT_FORM_DATA: CustomerFormValues = {
  name: '',
  code: '',
  contactPerson: '',
  contactPhone: '',
  wechat: '',
  whatsapp: '',
  facebook: '',
  instagram: '',
  telegram: '',
  email: '',
  address: '',
  status: 'Active',
  creditLimit: 0,
  balance: 0,
  version: 1,
}

export function useCustomerActionViewModel({ customer, t }: CustomerActionViewModelOptions) {
  const allowedEditStatuses = ['Active', 'Pending']
  const initialFormData = useMemo<CustomerFormValues>(() => (
    customer
      ? {
          name: customer.name,
          code: customer.code,
          contactPerson: customer.contactPerson,
          contactPhone: customer.contactPhone,
          wechat: customer.wechat,
          whatsapp: customer.whatsapp,
          facebook: customer.facebook,
          instagram: customer.instagram,
          telegram: customer.telegram,
          email: customer.email,
          address: customer.address,
          status: customer.status,
          creditLimit: customer.creditLimit,
          balance: customer.balance,
          version: customer.version,
        }
      : DEFAULT_FORM_DATA
  ), [customer])
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
