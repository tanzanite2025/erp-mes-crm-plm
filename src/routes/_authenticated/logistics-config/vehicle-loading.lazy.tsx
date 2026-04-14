import { createLazyFileRoute } from '@tanstack/react-router'
import { LogisticsVehicleLoadingTab } from '@/features/logistics-config/vehicle-loading/vehicle-loading-tab'

export const Route = createLazyFileRoute('/_authenticated/logistics-config/vehicle-loading')({
  component: LogisticsVehicleLoadingTab,
})
