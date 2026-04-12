import { Outlet } from '@tanstack/react-router'
import { StocktakeMgmt } from '@/features/warehouse/tabs/stocktake-mgmt'
import { StocktakeScanEntry } from './stocktake-scan-entry'

interface StocktakeRouteContentProps {
  mode?: 'scan'
}

export function StocktakeRouteContent({ mode }: StocktakeRouteContentProps) {
  if (mode === 'scan') {
    return <StocktakeScanEntry />
  }

  return (
    <>
      <StocktakeMgmt />
      <Outlet />
    </>
  )
}
