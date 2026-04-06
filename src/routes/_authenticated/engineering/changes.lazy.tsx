import { createLazyFileRoute } from '@tanstack/react-router'
import { ChangeOrdersTab } from '@/features/engineering/tabs/change-orders'

export const Route = createLazyFileRoute('/_authenticated/engineering/changes')({
  component: ChangeOrdersTab,
})
