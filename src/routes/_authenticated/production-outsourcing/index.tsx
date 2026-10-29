import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'

export const Route = createFileRoute('/_authenticated/production-outsourcing/')(
  {
    beforeLoad: () => {
      const user = useAuthStore.getState().user
      const target = (
        [
          '/production-outsourcing/orders',
          '/production-outsourcing/transfers',
          '/production-outsourcing/partners',
          '/production-outsourcing/task-and-partner-operation-guide',
          '/production-outsourcing/send-return-inspection-scanning-guide',
        ] as const
      ).find((path) => matchesPathPermissionProjection(user, path))
      throw redirect({ to: target ?? '/403', replace: true })
    },
  }
)
