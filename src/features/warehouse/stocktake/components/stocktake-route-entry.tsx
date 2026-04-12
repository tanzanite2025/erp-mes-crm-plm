import { Route } from '@/routes/_authenticated/warehouse/stocktake'
import { StocktakeRouteContent } from './stocktake-route-content'

export function StocktakeRouteEntry() {
  const { mode } = Route.useSearch()

  return <StocktakeRouteContent mode={mode} />
}
