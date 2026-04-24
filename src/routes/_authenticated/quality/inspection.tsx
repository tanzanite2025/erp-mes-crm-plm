import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/quality/inspection')({
  beforeLoad: () => {
    throw redirect({ to: '/production-quality/inspection' })
  },
})
