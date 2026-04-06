import { createLazyFileRoute } from '@tanstack/react-router'
import { ProductShipment } from '@/features/warehouse/tabs/index'

export const Route = createLazyFileRoute('/_authenticated/warehouse/shipment')({
  component: ProductShipment,
})
