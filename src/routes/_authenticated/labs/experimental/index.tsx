import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/labs/experimental/')({
  beforeLoad: () => {
    throw redirect({
      to: '/labs/experimental/equipment',
      replace: true,
    })
  },
})
