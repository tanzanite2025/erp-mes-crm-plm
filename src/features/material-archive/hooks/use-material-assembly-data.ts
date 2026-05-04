import { useQuery } from '@tanstack/react-query'
import { failLoudly } from '@/lib/safe-catch'
import { type MaterialOption, type PackagingRule } from '../data/schema'
import { MATERIAL_OPTIONS_QUERY_KEY, PACKAGING_RULES_QUERY_KEY } from '../query-keys'
import { MaterialCoreService } from '../services/material-core-service'
import { packagingService } from '../services/packaging-service'

const EMPTY_RULES: PackagingRule[] = []
const EMPTY_MATERIALS: MaterialOption[] = []

export function useMaterialAssemblyData() {
  const rulesQuery = useQuery({
    queryKey: PACKAGING_RULES_QUERY_KEY,
    queryFn: () => packagingService.getRules(),
  })

  const materialsQuery = useQuery({
    queryKey: MATERIAL_OPTIONS_QUERY_KEY,
    queryFn: () => MaterialCoreService.getMaterialOptions(),
  })

  const isLoading = rulesQuery.isLoading || materialsQuery.isLoading

  if (rulesQuery.isError) {
    failLoudly(rulesQuery.error, 'useMaterialAssemblyData.rules')
    throw rulesQuery.error
  }

  if (materialsQuery.isError) {
    failLoudly(materialsQuery.error, 'useMaterialAssemblyData.materials')
    throw materialsQuery.error
  }

  if (!isLoading && !rulesQuery.data) {
    const error = new Error('[CRITICAL] Missing packaging rules payload in material assembly manager')
    failLoudly(error, 'useMaterialAssemblyData.rules')
    throw error
  }

  if (!isLoading && !materialsQuery.data) {
    const error = new Error('[CRITICAL] Missing material options payload in material assembly manager')
    failLoudly(error, 'useMaterialAssemblyData.materials')
    throw error
  }

  return {
    rules: isLoading ? EMPTY_RULES : rulesQuery.data!,
    materials: isLoading ? EMPTY_MATERIALS : materialsQuery.data!,
    isLoading,
  }
}
