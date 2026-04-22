import { useMemo, useState } from 'react'
import { type WeavingMode } from '../data/weaving-mode-schema'

export function useWeavingModeFilterState(data: WeavingMode[]) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredData = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!normalizedSearch) {
      return data
    }

    return data.filter((item) => [
      item.label,
      item.normalizedRatioKey,
      item.description,
      item.isSystemPreset ? 'system preset' : 'custom',
    ].join(' ').toLowerCase().includes(normalizedSearch))
  }, [data, searchTerm])

  return {
    searchTerm,
    setSearchTerm,
    filteredData,
  }
}
