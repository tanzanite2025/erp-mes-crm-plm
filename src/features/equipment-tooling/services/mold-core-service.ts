'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { toMoldContract, toMoldDuplicateCheckContract, toMoldListPageContract } from '../adapters/equipment-mold-api-adapter'
import {
  type MoldApiDTO,
  type MoldDuplicateCheckApiDTO,
  type MoldListPageApiDTO,
} from '../contracts/equipment-mold-api-dto'

export const MoldCoreService = {
  async getMoldsWithVersion() {
    const res = await apiFetch<MoldListPageApiDTO>('/molds')
    const page = toMoldListPageContract(
      ensureObjectResponse<MoldListPageApiDTO & Record<string, unknown>>(
        res,
        'MoldCoreService.getMoldsWithVersion'
      ) as MoldListPageApiDTO
    )

    return { molds: page.items, version: page.version }
  },

  async getMolds() {
    const { molds } = await this.getMoldsWithVersion()
    return molds
  },

  async getMoldById(id: string) {
    const res = await apiFetch<MoldApiDTO>(`/molds/${id}`)
    return toMoldContract(
      ensureObjectResponse<MoldApiDTO & Record<string, unknown>>(
        res,
        'MoldCoreService.getMoldById'
      ) as MoldApiDTO
    )
  },

  async getGroupNames(): Promise<string[]> {
    const res = await apiFetch<string[]>('/molds/group-names')
    return ensureArrayResponse<string>(res, 'MoldCoreService.getGroupNames')
  },

  async isSnDuplicate(sn: string, excludeId?: string): Promise<boolean> {
    const query = new URLSearchParams({ sn })
    if (excludeId) {
      query.set('excludeId', excludeId)
    }

    const res = await apiFetch<MoldDuplicateCheckApiDTO>(`/molds/check-sn?${query.toString()}`)
    return toMoldDuplicateCheckContract(
      ensureObjectResponse<MoldDuplicateCheckApiDTO & Record<string, unknown>>(
        res,
        'MoldCoreService.isSnDuplicate'
      ) as MoldDuplicateCheckApiDTO
    )
  },
}
