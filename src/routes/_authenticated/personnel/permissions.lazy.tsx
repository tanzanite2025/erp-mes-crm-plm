import { createLazyFileRoute, redirect } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_authenticated/personnel/permissions')({
  component: () => {
    throw redirect({
      to: '/system-management/accounts',
      replace: true,
    })
  },
})
