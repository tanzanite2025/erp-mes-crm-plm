import { useQuery } from '@tanstack/react-query'
import {
  buildHoleCodeCombinationLabelMap,
  buildHoleCountLabelMap,
  buildHolePrefixLabelMap,
  getActiveHoleCodeCounts,
  getActiveHoleCodePrefixes,
  getHoleCodeCountOptions,
  getHoleCodePrefixOptions,
  SHARED_HOLE_CODE_SOURCE_QUERY_KEY,
  type HoleCodeSourceBundle,
} from '../data/hole-code-source'
import { holeCodeSourceService } from '../services/hole-code-source-service'

export function useHoleCodeSource() {
  return useQuery<HoleCodeSourceBundle>({
    queryKey: SHARED_HOLE_CODE_SOURCE_QUERY_KEY,
    queryFn: () => holeCodeSourceService.getHoleCodeSources(),
  })
}

export function useActiveHoleCodeSource() {
  const query = useHoleCodeSource()
  const bundle = query.data ?? { prefixes: [], counts: [] }
  const activePrefixes = getActiveHoleCodePrefixes(bundle)
  const activeCounts = getActiveHoleCodeCounts(bundle)

  return {
    ...query,
    activePrefixes,
    activeCounts,
    prefixOptions: getHoleCodePrefixOptions(activePrefixes),
    countOptions: getHoleCodeCountOptions(activeCounts),
    prefixLabelMap: buildHolePrefixLabelMap(activePrefixes),
    countLabelMap: buildHoleCountLabelMap(activeCounts),
    combinationLabelMap: buildHoleCodeCombinationLabelMap(
      activePrefixes,
      activeCounts
    ),
  }
}
