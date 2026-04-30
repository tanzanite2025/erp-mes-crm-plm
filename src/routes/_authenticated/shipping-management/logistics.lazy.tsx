import { createLazyFileRoute } from '@tanstack/react-router'
import { LogisticsMgmt } from '@/features/logistics'

export const Route = createLazyFileRoute('/_authenticated/shipping-management/logistics')({
  component: LogisticsMgmt,
})
