import { queryOptions } from '@tanstack/react-query'
import { ENGINEERING_DB_SPECS_QUERY_KEY } from '../query-keys'
import { SpecsService } from '../services/specs-service'

/** Shared cache and refresh policy for master-library editing and selection. */
export function createTechnicalSpecificationDocumentMasterLibraryListQueryOptions() {
  return queryOptions({
    queryKey: ENGINEERING_DB_SPECS_QUERY_KEY,
    queryFn: () => SpecsService.getSpecs(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  })
}

export function createTechnicalSpecificationDocumentMasterLibraryDetailQueryOptions(
  specificationId: string
) {
  return queryOptions({
    queryKey: [...ENGINEERING_DB_SPECS_QUERY_KEY, 'detail', specificationId],
    queryFn: () => SpecsService.getSpec(specificationId),
    refetchOnMount: 'always',
  })
}
