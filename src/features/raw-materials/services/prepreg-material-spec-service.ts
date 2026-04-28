import { apiFetch } from '@/lib/api-client'
import { ensureArrayField, ensureObjectResponse } from '@/lib/api-response'
import {
  normalizePrepregSpec,
  type PrepregMaterialSpec,
  type PrepregMaterialSpecListResponse,
} from '../data/prepreg-material-spec-schema'
import type { PrepregBindingQrItem } from '../prepreg-binding-qr/data/prepreg-binding-qr'

export type {
  PrepregMaterialSpec,
  PrepregMaterialSpecListResponse,
  PrepregMaterialSpecStatus,
} from '../data/prepreg-material-spec-schema'

export interface PrepregBindingTokenLookupResult {
  token: string
  status: 'UNBOUND' | 'BOUND'
  specId: string
  specCode: string
  specName: string
  boundAt: string
  expiresAt: string
}

function normalizePrepregBindingTokenLookupResult(
  input: Record<string, unknown>
): PrepregBindingTokenLookupResult {
  return {
    token: String(input.token ?? '').trim(),
    status: String(input.status ?? 'UNBOUND').trim() === 'BOUND' ? 'BOUND' : 'UNBOUND',
    specId: String(input.specId ?? '').trim(),
    specCode: String(input.specCode ?? '').trim(),
    specName: String(input.specName ?? '').trim(),
    boundAt: String(input.boundAt ?? '').trim(),
    expiresAt: String(input.expiresAt ?? '').trim(),
  }
}

function normalizePrepregBindingQrItem(input: Record<string, unknown>): PrepregBindingQrItem {
  return {
    id: String(input.id ?? '').trim(),
    token: String(input.token ?? '').trim(),
    expiresAt: String(input.expiresAt ?? '').trim(),
  }
}

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

  async getById(id: string): Promise<PrepregMaterialSpec> {
    const res = await apiFetch<PrepregMaterialSpec>(`/raw-materials/prepreg-specs/${id}`)
    return normalizePrepregSpec(
      ensureObjectResponse<PrepregMaterialSpec & Record<string, unknown>>(
        res,
        'PrepregMaterialSpecService.getById'
      )
    )
  },

  async getBindingToken(token: string): Promise<PrepregBindingTokenLookupResult> {
    const res = await apiFetch<Record<string, unknown>>(
      `/raw-materials/prepreg-binding-tokens/${encodeURIComponent(token)}`
    )
    return normalizePrepregBindingTokenLookupResult(
      ensureObjectResponse<Record<string, unknown>>(
        res,
        'PrepregMaterialSpecService.getBindingToken'
      )
    )
  },

  async createBindingTokenBatch(quantity: number): Promise<PrepregBindingQrItem[]> {
    const res = await apiFetch<Record<string, unknown>>('/raw-materials/prepreg-binding-tokens/batch', {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    })
    return ensureArrayField<Record<string, unknown>>(
      ensureObjectResponse<Record<string, unknown>>(res, 'PrepregMaterialSpecService.createBindingTokenBatch'),
      'items',
      'PrepregMaterialSpecService.createBindingTokenBatch'
    ).map(normalizePrepregBindingQrItem)
  },

  async save(
    spec: Partial<PrepregMaterialSpec> & {
      bindToken?: string
    }
  ): Promise<PrepregMaterialSpec> {
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

  async bindTokenToSpec(token: string, specId: string): Promise<PrepregBindingTokenLookupResult> {
    const res = await apiFetch<Record<string, unknown>>(
      `/raw-materials/prepreg-binding-tokens/${encodeURIComponent(token)}/bind`,
      {
        method: 'POST',
        body: JSON.stringify({ specId }),
      }
    )
    return normalizePrepregBindingTokenLookupResult(
      ensureObjectResponse<Record<string, unknown>>(
        res,
        'PrepregMaterialSpecService.bindTokenToSpec'
      )
    )
  },

  async remove(id: string): Promise<void> {
    await apiFetch(`/raw-materials/prepreg-specs/${id}`, { method: 'DELETE' })
  },
}
