import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/equipment-tooling/')({
  beforeLoad: () => {
    throw redirect({
      to: '/equipment-tooling/molds',
      replace: true,
    })
  },
})
