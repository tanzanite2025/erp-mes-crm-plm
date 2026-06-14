import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaSet, type DeltaPayload } from '@/lib/delta/types'
import { createLogger } from '@/lib/logger'
import { buildVersionedPatchMetadata } from '@/lib/version-guard'

const logger = createLogger('UnitService')
const UNIT_PATCH_INTENT_SAVE = 'UNIT_PATCH_SAVE'

export type UnitCategory =
  | 'QUANTITY'
  | 'WEIGHT'
  | 'LENGTH'
  | 'AREA'
  | 'VOLUME'
  | 'TIME'
  | 'OTHER'

export interface Unit {
  id: string
  code: string
  name: string
  category: UnitCategory
  precision: number
  status: 'active' | 'inactive'
  isSystem: boolean
  version?: number
  description?: string
}

export const unitService = {
  getUnits: async (): Promise<Unit[]> => {
    const res = await apiFetch<Unit[]>('/basic/units')
    return ensureArrayResponse<Unit>(res, 'UnitService.getUnits')
  },

  saveUnits: async (_units: Unit[]) => {
    logger.warn(
      'saveUnits is deprecated, use sync or individual update methods.'
    )
  },

  sync: async (units: Array<Omit<Unit, 'id' | 'isSystem'>>) => {
    const res = await apiFetch<{ count: number }>('/basic/units/sync', {
      method: 'POST',
      body: JSON.stringify(units),
    })
    return ensureObjectResponse<{ count: number }>(res, 'UnitService.sync')
  },

  addUnit: async (unit: Omit<Unit, 'id' | 'isSystem'>): Promise<Unit> => {
    const res = await apiFetch<Unit>('/basic/units', {
      method: 'POST',
      body: JSON.stringify(unit),
    })
    return ensureObjectResponse<Unit & Record<string, unknown>>(
      res,
      'UnitService.addUnit'
    ) as Unit
  },

  patchUnit: async (
    id: string,
    delta: DeltaSet,
    version?: number
  ): Promise<Unit> => {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: buildVersionedPatchMetadata(
        id,
        version,
        'UnitService.patchUnit',
        {
          intent: UNIT_PATCH_INTENT_SAVE,
        }
      ),
    }

    const res = await apiFetch<Unit>(`/basic/units/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return ensureObjectResponse<Unit & Record<string, unknown>>(
      res,
      'UnitService.patchUnit'
    ) as Unit
  },

  deleteUnit: async (id: string) => {
    await apiFetch(`/basic/units/${id}`, {
      method: 'DELETE',
    })
  },
}
