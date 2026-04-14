import { createLazyFileRoute } from '@tanstack/react-router'
import { LogisticsPlatformsTab } from '@/features/logistics-config/platforms-tab'

export const Route = createLazyFileRoute('/_authenticated/logistics-config/platforms')({
  component: LogisticsPlatformsTab,
})
