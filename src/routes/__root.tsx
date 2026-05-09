import { type QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext } from '@tanstack/react-router'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { RootRouteComponent } from '@/components/layout/root-route-component'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootRouteComponent,
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
