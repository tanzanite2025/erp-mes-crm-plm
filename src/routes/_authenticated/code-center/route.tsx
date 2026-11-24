import { createFileRoute } from '@tanstack/react-router'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'
import { CodeCenterProductCodeOperationGuideRouteLayout } from '@/features/code-center/components/code-center-product-code-operation-guide-route-layout'

export const Route = createFileRoute('/_authenticated/code-center')({
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  component: CodeCenterProductCodeOperationGuideRouteLayout,
})
