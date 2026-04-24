import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/quality/abnormalities')({
  beforeLoad: () => {
    throw redirect({ to: '/production-quality/abnormalities' })
  },
})
