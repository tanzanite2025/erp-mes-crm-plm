import { createFileRoute } from '@tanstack/react-router'
import { PaymentTermsTab } from '@/features/finance/tabs/payment-terms-tab'

export const Route = createFileRoute(
  '/_authenticated/finance-management/payment-terms'
)({
  component: () => <PaymentTermsTab />,
})
