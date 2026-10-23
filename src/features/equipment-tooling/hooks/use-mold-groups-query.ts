'use client'

import { useQuery } from '@tanstack/react-query'
import { createMoldMasterLibraryGroupNamesQueryOptions } from '../queries/mold-master-library-query-options'

export function useMoldGroupsQuery(open: boolean) {
  return useQuery({
    ...createMoldMasterLibraryGroupNamesQueryOptions(),
    enabled: open,
  })
}
