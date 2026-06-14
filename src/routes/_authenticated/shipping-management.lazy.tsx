import { createLazyFileRoute } from '@tanstack/react-router'
import { ShippingManagementModule } from '@/features/trading/shipping-management'

export const Route = createLazyFileRoute('/_authenticated/shipping-management')(
  {
    component: ShippingManagementModule,
  }
)
