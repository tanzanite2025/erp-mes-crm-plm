import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/logistics-settings/')({
  beforeLoad: () => {
    throw redirect({ to: '/logistics-settings/scanning', replace: true })
  },
})
