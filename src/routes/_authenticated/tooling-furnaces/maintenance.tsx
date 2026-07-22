import { createFileRoute } from '@tanstack/react-router'
import { FurnaceMaintenancePage } from '@/features/tooling-furnaces/pages/furnace-maintenance-page'

interface FurnaceMaintenanceSearch {
  assetId?: string
}

export const Route = createFileRoute(
  '/_authenticated/tooling-furnaces/maintenance'
)({
  validateSearch: (search): FurnaceMaintenanceSearch => ({
    assetId:
      typeof search.assetId === 'string' && search.assetId.trim()
        ? search.assetId
        : undefined,
  }),
  component: FurnaceMaintenanceRoute,
})

function FurnaceMaintenanceRoute() {
  const { assetId } = Route.useSearch()
  return <FurnaceMaintenancePage assetId={assetId} />
}
