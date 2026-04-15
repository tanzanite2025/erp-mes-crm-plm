import { createLazyFileRoute } from '@tanstack/react-router'
import { LogisticsSettingsModule } from '@/features/logistics-settings'

export const Route = createLazyFileRoute('/_authenticated/logistics-settings')({
  component: LogisticsSettingsModule,
})
