import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import {
  engineeringSpecApiDTOArraySchema,
  engineeringSpecApiDTOSchema,
  engineeringSpecInputSchema,
  engineeringSpecPatchRequestSchema,
  type EngineeringSpecApiDTO,
  type EngineeringSpecInputDTO,
} from '../contracts/engineering-spec-api-contract'

export type EngineeringSpec = EngineeringSpecApiDTO

export type EngineeringSpecInput = EngineeringSpecInputDTO

function parseEngineeringSpec(item: unknown, scope: string): EngineeringSpec {
  return engineeringSpecApiDTOSchema.parse(
    ensureObjectResponse<Record<string, unknown>>(item as Record<string, unknown>, scope)
  )
}

function parseEngineeringSpecArray(items: unknown, scope: string): EngineeringSpec[] {
  return engineeringSpecApiDTOArraySchema.parse(ensureArrayResponse(items, scope))
}

export const engineeringSpecService = {
  getSpecs: async (type?: string): Promise<EngineeringSpec[]> => {
    const url = type ? `/engineering/specs?type=${type}` : '/engineering/specs'
    const res = await apiFetch<EngineeringSpecApiDTO[]>(url)
    return parseEngineeringSpecArray(res, 'engineeringSpecService.getSpecs')
  },

  getSpec: async (id: string): Promise<EngineeringSpec> => {
    const res = await apiFetch<EngineeringSpecApiDTO>(`/engineering/specs/${id}`)
    return parseEngineeringSpec(res, 'engineeringSpecService.getSpec')
  },

  saveSpec: async (spec: EngineeringSpecInput): Promise<EngineeringSpec> => {
    const payload = engineeringSpecInputSchema.parse(spec)
    const res = await apiFetch<EngineeringSpecApiDTO>('/engineering/specs', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return parseEngineeringSpec(res, 'engineeringSpecService.saveSpec')
  },

  patchSpec: async (id: string, delta: Record<string, unknown>, version: number): Promise<EngineeringSpec> => {
    const payload = engineeringSpecPatchRequestSchema.parse({ delta, version })
    const res = await apiFetch<EngineeringSpecApiDTO>(`/engineering/specs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return parseEngineeringSpec(res, 'engineeringSpecService.patchSpec')
  },

  syncSpecs: async (specs: unknown[]): Promise<unknown> => {
    return apiFetch('/engineering/specs/sync', {
      method: 'POST',
      body: JSON.stringify(specs),
    })
  },

  deleteSpec: async (id: string): Promise<void> => {
    return apiFetch<void>(`/engineering/specs/${id}`, {
      method: 'DELETE',
    })
  }
};
