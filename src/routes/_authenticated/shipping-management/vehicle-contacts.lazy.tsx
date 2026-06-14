import { createLazyFileRoute } from '@tanstack/react-router'
import { VehicleContactsPage } from '@/features/shipping-management/vehicle-contacts-page'

export const Route = createLazyFileRoute(
  '/_authenticated/shipping-management/vehicle-contacts'
)({
  component: VehicleContactsPage,
})
