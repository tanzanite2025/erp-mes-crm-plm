import { createLazyFileRoute } from '@tanstack/react-router'
import { LogisticsScanningConfigTab } from '@/features/logistics-config/scanning-config-tab'

export const Route = createLazyFileRoute('/_authenticated/logistics-config/scanning')({
  component: LogisticsScanningConfigTab,
})
