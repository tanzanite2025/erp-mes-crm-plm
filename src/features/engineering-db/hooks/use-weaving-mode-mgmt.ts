import { useWeavingModeFilterState } from './use-weaving-mode-filter-state'
import { useWeavingModeQueryState } from './use-weaving-mode-query-state'

export function useWeavingModeMgmt() {
  const queryState = useWeavingModeQueryState()
  const filterState = useWeavingModeFilterState(queryState.data)

  return {
    ...queryState,
    ...filterState,
  }
}
