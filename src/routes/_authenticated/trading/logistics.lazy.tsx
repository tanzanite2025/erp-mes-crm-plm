import { createLazyFileRoute } from '@tanstack/react-router'
import { LogisticsMgmt } from '@/features/trading/tabs/index'

export const Route = createLazyFileRoute('/_authenticated/trading/logistics')({
  component: LogisticsMgmt,
})
