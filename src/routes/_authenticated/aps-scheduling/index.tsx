import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/aps-scheduling/')({
  beforeLoad: () => {
    throw redirect({ to: '/aps-scheduling/board' })
  },
})
