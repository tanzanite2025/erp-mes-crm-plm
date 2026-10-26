import type { SetStateAction } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'

export function parseBusinessRecordSearchRouteParameters(
  parameters: Record<string, unknown>
): { search?: string; detailId?: string } {
  return {
    search:
      typeof parameters.search === 'string' ? parameters.search : undefined,
    detailId:
      typeof parameters.detailId === 'string' ? parameters.detailId : undefined,
  }
}

// The URL owns the editable filter, so selecting a previous search result also
// resets manual filtering when the destination list is already mounted.
export function useBusinessRecordSearchKeyword() {
  const navigate = useNavigate()
  const parameters = useSearch({ strict: false })
  const searchKeyword =
    typeof parameters.search === 'string' ? parameters.search : ''

  function setBusinessRecordSearchKeyword(value: SetStateAction<string>) {
    void navigate({
      to: '.',
      search: (previous) => {
        const previousKeyword =
          typeof previous.search === 'string' ? previous.search : ''
        const nextKeyword =
          typeof value === 'function' ? value(previousKeyword) : value
        return { ...previous, search: nextKeyword || undefined }
      },
      replace: true,
    })
  }

  return [searchKeyword, setBusinessRecordSearchKeyword] as const
}
