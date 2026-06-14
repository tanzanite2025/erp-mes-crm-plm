import { createLazyFileRoute } from '@tanstack/react-router'
import { StocktakeRouteEntry } from '@/features/warehouse/stocktake/components/stocktake-route-entry'

export const Route = createLazyFileRoute('/_authenticated/warehouse/stocktake')(
  {
    component: StocktakeRouteEntry,
  }
)
