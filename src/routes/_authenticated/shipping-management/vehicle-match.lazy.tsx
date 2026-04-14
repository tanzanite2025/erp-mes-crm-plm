import { createLazyFileRoute } from '@tanstack/react-router'
import { ShippingVehicleMatchPage } from '@/features/trading/shipping-management/vehicle-match-page'

export const Route = createLazyFileRoute('/_authenticated/shipping-management/vehicle-match')({
  component: ShippingVehicleMatchPage,
})
