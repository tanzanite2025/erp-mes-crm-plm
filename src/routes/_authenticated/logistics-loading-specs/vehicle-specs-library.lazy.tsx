import { createLazyFileRoute } from '@tanstack/react-router'
import { VehicleSpecsLibraryPage } from '@/features/logistics-config/vehicle-specs-library'

export const Route = createLazyFileRoute(
  '/_authenticated/logistics-loading-specs/vehicle-specs-library'
)({
  component: VehicleSpecsLibraryPage,
})
