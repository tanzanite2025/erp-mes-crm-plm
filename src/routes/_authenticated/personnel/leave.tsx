import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/personnel/leave')({
  beforeLoad: () => {
    throw redirect({ to: '/leave-management', replace: true })
  },
})
