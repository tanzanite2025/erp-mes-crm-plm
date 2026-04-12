import type { QueryKey } from '@tanstack/react-query'

export const financeQueryKeys = {
  all: (): QueryKey => ['finance'],
  currencies: (): QueryKey => ['finance', 'currencies'],
  paymentMethods: (): QueryKey => ['finance', 'payment-methods'],
  paymentTerms: (): QueryKey => ['finance', 'payment-terms'],
  taxRates: (): QueryKey => ['finance', 'tax-rates'],
} as const
