import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/production-outsourcing/')(
  {
    beforeLoad: () => {
      throw redirect({ to: '/production-outsourcing/partners' })
    },
  }
)
