import { Outlet, createLazyFileRoute } from '@tanstack/react-router'
import { StocktakeMgmt } from '@/features/warehouse/tabs/stocktake-mgmt'

export const Route = createLazyFileRoute('/_authenticated/warehouse/stocktake')({
  component: StocktakeRouteComponent,
})

function StocktakeRouteComponent() {
  return (
    <>
      <StocktakeMgmt />
      <Outlet />
    </>
  )
}
