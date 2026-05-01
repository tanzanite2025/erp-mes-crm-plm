import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/warehouse-config/')({
  beforeLoad: () => {
    throw redirect({ to: '/warehouse-config/packaging-assembly' })
  },
})
