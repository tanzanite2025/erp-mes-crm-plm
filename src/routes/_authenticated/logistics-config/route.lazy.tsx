import { createLazyFileRoute } from '@tanstack/react-router'
import { LogisticsConfigModule } from '@/features/logistics-config'

export const Route = createLazyFileRoute('/_authenticated/logistics-config')({
  component: LogisticsConfigModule,
})
