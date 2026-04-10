import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import {
  toMaterialListPageContract,
  toMaterialOptionContracts,
} from '../adapters/material-api-adapter'
import type {
  MaterialListPageApiDTO,
  MaterialOptionsResponseApiDTO,
} from '../contracts/material-api-dto'
import { type Material, type MaterialOption } from '../data/schema'

export const MaterialCoreService = {
  async getMaterialOptions(): Promise<MaterialOption[]> {
    const res = await apiFetch<MaterialOptionsResponseApiDTO>('/materials?options=true')
    const checked = ensureObjectResponse<MaterialOptionsResponseApiDTO & Record<string, unknown>>(
      res,
      'MaterialCoreService.getMaterialOptions'
    )

    return toMaterialOptionContracts(
      ensureArrayResponse(checked.items, 'MaterialCoreService.getMaterialOptions.items')
    )
  },

  async getMaterials(
    category?: string,
    page: number = 1,
    pageSize: number = 20,
    search: string = ''
  ): Promise<{ data: Material[]; total: number }> {
    const { data, total } = await this.getMaterialsWithVersion(category, page, pageSize, search)
    return { data, total }
  },

  async getMaterialsWithVersion(
    category?: string,
    page: number = 1,
    pageSize: number = 20,
    search: string = ''
  ): Promise<{ data: Material[]; total: number; version: string }> {
    const params = new URLSearchParams()
    if (category && category !== 'all') params.append('category', category.toUpperCase())
    params.append('page', page.toString())
    params.append('pageSize', pageSize.toString())
    if (search) params.append('search', search)

    const res = await apiFetch<MaterialListPageApiDTO>(`/materials?${params.toString()}`)
    const checked = ensureObjectResponse<MaterialListPageApiDTO & Record<string, unknown>>(
      res,
      'MaterialCoreService.getMaterialsWithVersion'
    )
    const pageResult = toMaterialListPageContract(checked)

    return {
      data: pageResult.items,
      total: pageResult.total || 0,
      version: pageResult.version || '1',
    }
  },
}
