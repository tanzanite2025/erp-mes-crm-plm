import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/basic-settings/')({
  beforeLoad: () => {
    throw redirect({ to: '/basic-settings/units' })
  },
})
