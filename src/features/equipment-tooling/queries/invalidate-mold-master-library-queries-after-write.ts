import type { QueryClient } from '@tanstack/react-query'
import { PRODUCTS_QUERY_KEY } from '@/features/engineering/query-keys'
import {
  MOLD_GROUP_NAMES_QUERY_KEY,
  MOLDS_QUERY_KEY,
} from '../mold-master-library-query-keys'
import { MOLD_GROUP_MASTER_DIRECTORY_QUERY_KEY } from './mold-group-master-directory-query-options'

export async function invalidateMoldMasterLibraryQueriesAfterWrite(
  queryClient: QueryClient
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: MOLDS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: MOLD_GROUP_NAMES_QUERY_KEY }),
    queryClient.invalidateQueries({
      queryKey: MOLD_GROUP_MASTER_DIRECTORY_QUERY_KEY,
    }),
    queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY }),
  ])
}
