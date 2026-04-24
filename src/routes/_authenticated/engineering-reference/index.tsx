import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/engineering-reference/')({
  beforeLoad: () => {
    throw redirect({ to: '/engineering-reference/spoke-length', replace: true })
  },
})
