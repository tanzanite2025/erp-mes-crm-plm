import { createFileRoute, redirect } from '@tanstack/react-router'
import { waitForAuthHydration } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: async () => {
    await waitForAuthHydration()

    throw redirect({
      href: '/dashboard/overview',
      replace: true,
    })
  },
})
