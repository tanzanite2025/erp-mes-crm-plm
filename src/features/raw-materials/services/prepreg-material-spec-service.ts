import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  normalizePrepregSpec,
  type PrepregMaterialSpec,
  type PrepregMaterialSpecListResponse,
} from '../data/prepreg-material-spec-schema'

export type {
  PrepregMaterialSpec,
  PrepregMaterialSpecListResponse,
  PrepregMaterialSpecStatus,
} from '../data/prepreg-material-spec-schema'

export const PrepregMaterialSpecService = {
  async list(search = '', page = 1, pageSize = 200): Promise<PrepregMaterialSpecListResponse> {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))
    if (search.trim()) params.set('search', search.trim())

    const res = await apiFetch<PrepregMaterialSpecListResponse>(`/raw-materials/prepreg-specs?${params.toString()}`)
    const checked = ensureObjectResponse<PrepregMaterialSpecListResponse & Record<string, unknown>>(
      res,
      'PrepregMaterialSpecService.list'
    )

    return {
      items: Array.isArray(checked.items) ? checked.items.map(normalizePrepregSpec) : [],
      total: Number(checked.total) || 0,
      page: Number(checked.page) || page,
      pageSize: Number(checked.pageSize) || pageSize,
    }
  },

  async save(spec: Partial<PrepregMaterialSpec>): Promise<PrepregMaterialSpec> {
    const res = await apiFetch<PrepregMaterialSpec>('/raw-materials/prepreg-specs', {
      method: 'POST',
      body: JSON.stringify(spec),
    })
    return normalizePrepregSpec(
      ensureObjectResponse<PrepregMaterialSpec & Record<string, unknown>>(
        res,
        'PrepregMaterialSpecService.save'
      )
    )
  },

  async remove(id: string): Promise<void> {
    await apiFetch(`/raw-materials/prepreg-specs/${id}`, { method: 'DELETE' })
  },
}
