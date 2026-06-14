import { type QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext } from '@tanstack/react-router'
import { RootRouteComponent } from '@/components/layout/root-route-component'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootRouteComponent,
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
