import { getRouteApi } from '@tanstack/react-router'
import { ProductionMaterialIssuancePage } from './production-material-issuance-page'

const productionMaterialIssuanceRouteApi = getRouteApi(
  '/_authenticated/mrp/production-material-issuance'
)

export function ProductionMaterialIssuanceRoutePage() {
  const search = productionMaterialIssuanceRouteApi.useSearch()
  const navigate = productionMaterialIssuanceRouteApi.useNavigate()
  return (
    <ProductionMaterialIssuancePage
      startRequested={search.intent === 'start'}
      onStartRequestHandled={() => void navigate({ search: {}, replace: true })}
    />
  )
}
