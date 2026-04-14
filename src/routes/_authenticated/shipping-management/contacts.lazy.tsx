import { createLazyFileRoute } from '@tanstack/react-router'
import { ShippingContactsPage } from '@/features/trading/shipping-management/contacts-page'

export const Route = createLazyFileRoute('/_authenticated/shipping-management/contacts')({
  component: ShippingContactsPage,
})
