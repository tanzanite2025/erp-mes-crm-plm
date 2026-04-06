import { createFileRoute } from '@tanstack/react-router'
import { CurrencyTab } from '@/features/finance/tabs/currency-tab'

export const Route = createFileRoute('/_authenticated/finance-management/currency-rates')({
  component: () => <CurrencyTab />,
})
