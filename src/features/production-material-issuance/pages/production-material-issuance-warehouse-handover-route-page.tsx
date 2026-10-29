import { getRouteApi } from '@tanstack/react-router'
import { ProductionMaterialIssuanceWarehouseHandoverHandlingPage } from './production-material-issuance-warehouse-handover-handling-page'

const productionMaterialHandoverRouteApi = getRouteApi(
  '/_authenticated/warehouse/production-material-handovers'
)

export function ProductionMaterialIssuanceWarehouseHandoverRoutePage() {
  const { documentId } = productionMaterialHandoverRouteApi.useSearch()
  return (
    <ProductionMaterialIssuanceWarehouseHandoverHandlingPage
      key={documentId ?? 'list'}
      initialDocumentId={documentId}
    />
  )
}
