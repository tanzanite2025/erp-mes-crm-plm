import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
import { type PositionApiDTO } from '../contracts/position-api-dto'

export type PositionOptionRecord = {
  id: string
  name: string
  code?: string
  orgUnitId?: string
  orgUnitName?: string
  status: string
}

function normalizeOptionalString(
  value: string | null | undefined
): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
}

export const PositionService = {
  getPositions: async (): Promise<PositionOptionRecord[]> => {
    const data = await apiFetch<PositionApiDTO[]>('/positions')
    if (!data) {
      throw new Error(
        '[CRITICAL_DATA_PATH] Failed to fetch positions: Null response'
      )
    }

    return ensureArrayResponse<PositionApiDTO>(
      data,
      'PositionService.getPositions'
    ).map((item) => ({
      id: item.id,
      name: item.name,
      code: normalizeOptionalString(item.code),
      orgUnitId: normalizeOptionalString(item.orgUnitId),
      orgUnitName: normalizeOptionalString(item.orgUnitName),
      status: item.status,
    }))
  },
}
