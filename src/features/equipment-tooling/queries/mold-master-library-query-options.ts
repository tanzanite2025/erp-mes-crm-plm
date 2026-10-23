import { queryOptions } from '@tanstack/react-query'
import {
  MOLD_GROUP_NAMES_QUERY_KEY,
  MOLD_MASTER_LIBRARY_SELECTION_OPTIONS_QUERY_KEY,
} from '../mold-master-library-query-keys'
import { MoldCoreService } from '../services/mold-core-service'

export function createMoldMasterLibraryGroupNamesQueryOptions() {
  return queryOptions({
    queryKey: MOLD_GROUP_NAMES_QUERY_KEY,
    queryFn: () => MoldCoreService.getGroupNames(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  })
}

export function createMoldMasterLibrarySelectionOptionsQueryOptions() {
  return queryOptions({
    queryKey: MOLD_MASTER_LIBRARY_SELECTION_OPTIONS_QUERY_KEY,
    queryFn: () => MoldCoreService.getMoldMasterLibrarySelectionOptions(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  })
}
