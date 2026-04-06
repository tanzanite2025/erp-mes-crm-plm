import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/personnel/')({
  beforeLoad: () => {
    throw redirect({ to: '/personnel/org' })
  },
})
