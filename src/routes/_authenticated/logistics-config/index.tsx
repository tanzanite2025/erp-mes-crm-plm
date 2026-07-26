import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/logistics-config/')({
  beforeLoad: () => {
    throw redirect({ to: '/logistics-config/vehicle-loading' })
  },
})
