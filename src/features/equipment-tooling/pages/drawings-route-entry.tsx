import { getRouteApi } from '@tanstack/react-router'
import { DrawingMgmt } from '../tabs/drawing-mgmt'

const drawingsRoute = getRouteApi('/_authenticated/equipment-tooling/drawings')

export function DrawingsRouteEntry() {
  const search = drawingsRoute.useSearch()
  const navigate = drawingsRoute.useNavigate()

  return (
    <DrawingMgmt
      search={search}
      onActionConsumed={() => {
        navigate({
          replace: true,
          search: (prev) => ({
            ...prev,
            action: undefined,
          }),
        })
      }}
    />
  )
}
