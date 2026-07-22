import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/attendance-management/')({
  beforeLoad: () => {
    throw redirect({ to: '/attendance-management/leave' })
  },
})
