import { useQuery } from '@tanstack/react-query'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import {
  APPEARANCE_MAPPING_KEY,
  APPEARANCE_MAPPING_QUERY_KEY,
  DEFAULT_APPEARANCE_MAPPING,
  type AppearanceMapping,
} from '../data/appearance-mapping'

export function useAppearanceMapping() {
  return useQuery<AppearanceMapping>({
    queryKey: APPEARANCE_MAPPING_QUERY_KEY,
    queryFn: async () => {
      const stored = await StorageService.getItem<AppearanceMapping>(APPEARANCE_MAPPING_KEY)
      return stored || DEFAULT_APPEARANCE_MAPPING
    },
    initialData: DEFAULT_APPEARANCE_MAPPING,
  })
}
