import { createLazyFileRoute } from '@tanstack/react-router'
import { ContactsPage } from '@/features/shipping-management/contacts-page'

export const Route = createLazyFileRoute('/_authenticated/shipping-management/contacts')({
  component: ContactsPage,
})
