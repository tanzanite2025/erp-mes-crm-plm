import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/business-analysis/')({
  beforeLoad: () => {
    throw redirect({ to: '/business-analysis/overview' })
  },
})
