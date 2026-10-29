import { queryOptions } from '@tanstack/react-query'
import { MoldGroupMasterService } from '../services/mold-group-master-service'

export const MOLD_GROUP_MASTER_DIRECTORY_QUERY_KEY = [
  'equipment-tooling',
  'mold-group-master-directory',
] as const

export function createMoldGroupMasterDirectoryQueryOptions() {
  return queryOptions({
    queryKey: MOLD_GROUP_MASTER_DIRECTORY_QUERY_KEY,
    queryFn: () => MoldGroupMasterService.getMoldGroupDirectory(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  })
}
