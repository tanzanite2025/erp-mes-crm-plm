import { createFileRoute } from '@tanstack/react-router'
import { TaxationTab } from '@/features/finance/tabs/taxation-tab'

export const Route = createFileRoute('/_authenticated/finance-management/taxation')({
  component: () => <TaxationTab />,
})
