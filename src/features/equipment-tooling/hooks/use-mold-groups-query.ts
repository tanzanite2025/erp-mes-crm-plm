'use client'

import { useQuery } from '@tanstack/react-query'
import { AssetService } from '../services/asset-service'

export const MOLD_GROUP_NAMES_QUERY_KEY = [
  'equipment-tooling',
  'mold-group-names',
] as const

export function useMoldGroupsQuery(open: boolean) {
  return useQuery({
    queryKey: MOLD_GROUP_NAMES_QUERY_KEY,
    queryFn: () => AssetService.getGroupNames(),
    enabled: open,
  })
}
