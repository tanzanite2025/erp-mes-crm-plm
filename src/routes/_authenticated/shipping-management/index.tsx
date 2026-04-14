import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/shipping-management/')({
  beforeLoad: () => {
    throw redirect({ to: '/shipping-management/vehicle-match' })
  },
})
