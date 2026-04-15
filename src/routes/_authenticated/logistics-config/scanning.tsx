import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/logistics-config/scanning')({
  beforeLoad: () => {
    throw redirect({ to: '/logistics-settings/scanning', replace: true })
  },
})
