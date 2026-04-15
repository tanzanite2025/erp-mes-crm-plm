import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/logistics-config/platforms')({
  beforeLoad: () => {
    throw redirect({ to: '/logistics-settings/platforms', replace: true })
  },
})
