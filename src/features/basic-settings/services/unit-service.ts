import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

const logger = createLogger('UnitService')

export type UnitCategory = 'QUANTITY' | 'WEIGHT' | 'LENGTH' | 'AREA' | 'VOLUME' | 'TIME' | 'OTHER'

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
    logger.warn('saveUnits is deprecated, use sync or individual update methods.')
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
    return ensureObjectResponse<Unit & Record<string, unknown>>(res, 'UnitService.addUnit') as Unit
  },

  updateUnit: async (id: string, updates: Partial<Unit>): Promise<Unit> => {
    const res = await apiFetch<Unit>('/basic/units', {
      method: 'POST',
      body: JSON.stringify({ ...updates, id }),
    })
    return ensureObjectResponse<Unit & Record<string, unknown>>(res, 'UnitService.updateUnit') as Unit
  },

  deleteUnit: async (id: string) => {
    await apiFetch(`/basic/units/${id}`, {
      method: 'DELETE',
    })
  },
}
