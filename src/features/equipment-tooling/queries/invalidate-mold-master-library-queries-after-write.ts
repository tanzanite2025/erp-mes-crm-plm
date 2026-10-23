import type { QueryClient } from '@tanstack/react-query'
import {
  MOLD_GROUP_NAMES_QUERY_KEY,
  MOLDS_QUERY_KEY,
} from '../mold-master-library-query-keys'

export async function invalidateMoldMasterLibraryQueriesAfterWrite(
  queryClient: QueryClient
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: MOLDS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: MOLD_GROUP_NAMES_QUERY_KEY }),
  ])
}
