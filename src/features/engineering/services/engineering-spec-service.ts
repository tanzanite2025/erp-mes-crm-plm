import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  engineeringSpecApiDTOArraySchema,
  engineeringSpecApiDTOSchema,
  engineeringSpecInputApiSchema,
  engineeringSpecInputSchema,
  engineeringSpecListPageApiDTOSchema,
  engineeringSpecPatchRequestSchema,
  type EngineeringSpecApiDTO,
  type EngineeringSpecInputDTO,
  type EngineeringSpecListPageApiDTO,
} from '../contracts/engineering-spec-api-contract'

export type EngineeringSpec = EngineeringSpecApiDTO

export type EngineeringSpecInput = EngineeringSpecInputDTO

const ENGINEERING_SPEC_BUCKET_KEYS = [
  'specData',
  'drillingData',
  'cuttingData',
  'labelingData',
  'spokeLengthData',
  'hubData',
  'nippleData',
] as const

function normalizeEngineeringSpecBuckets<T extends Record<string, unknown>>(item: T): T {
  const normalized = { ...item }

  ENGINEERING_SPEC_BUCKET_KEYS.forEach((key) => {
    if (normalized[key] == null) {
      delete normalized[key]
    }
  })

  return normalized as T
}

function toEngineeringSpecContract(dto: EngineeringSpecApiDTO): EngineeringSpec {
  return dto
}

function toEngineeringSpecInputApiDTO(input: EngineeringSpecInput): EngineeringSpecInputDTO {
  return engineeringSpecInputApiSchema.parse(input)
}

function parseEngineeringSpec(item: unknown, scope: string): EngineeringSpec {
  return toEngineeringSpecContract(
    engineeringSpecApiDTOSchema.parse(
      normalizeEngineeringSpecBuckets(
        ensureObjectResponse<Record<string, unknown>>(item as Record<string, unknown>, scope)
      )
    )
  )
}

function parseEngineeringSpecList(response: unknown, scope: string): EngineeringSpec[] {
  if (Array.isArray(response)) {
    return engineeringSpecApiDTOArraySchema.parse(
      response.map((item, index) =>
        normalizeEngineeringSpecBuckets(
          ensureObjectResponse<Record<string, unknown>>(item as Record<string, unknown>, `${scope}[${index}]`)
        )
      )
    )
      .map(toEngineeringSpecContract)
  }

  const rawPage = ensureObjectResponse<Record<string, unknown>>(response, scope)

  return engineeringSpecListPageApiDTOSchema.parse({
    ...rawPage,
    items: Array.isArray(rawPage.items)
      ? rawPage.items.map((item, index) =>
          normalizeEngineeringSpecBuckets(
            ensureObjectResponse<Record<string, unknown>>(item as Record<string, unknown>, `${scope}.items[${index}]`)
          )
        )
      : rawPage.items,
  }).items.map(toEngineeringSpecContract)
}

function buildEngineeringSpecsUrl(type?: string): string {
  const query = new URLSearchParams({ options: 'true' })
  if (type) {
    query.set('type', type)
  }

  return `/engineering/specs?${query.toString()}`
}

export const engineeringSpecService = {
  getSpecs: async (type?: string): Promise<EngineeringSpec[]> => {
    const res = await apiFetch<EngineeringSpecApiDTO[] | EngineeringSpecListPageApiDTO>(
      buildEngineeringSpecsUrl(type),
    )
    return parseEngineeringSpecList(res, 'engineeringSpecService.getSpecs')
  },

  getSpec: async (id: string): Promise<EngineeringSpec> => {
    const res = await apiFetch<EngineeringSpecApiDTO>(`/engineering/specs/${id}`)
    return parseEngineeringSpec(res, 'engineeringSpecService.getSpec')
  },

  saveSpec: async (spec: EngineeringSpecInput): Promise<EngineeringSpec> => {
    const payload = engineeringSpecInputSchema.parse(spec)
    const apiPayload = toEngineeringSpecInputApiDTO(payload)
    const res = await apiFetch<EngineeringSpecApiDTO>('/engineering/specs', {
      method: 'POST',
      body: JSON.stringify(apiPayload),
    })
    return parseEngineeringSpec(res, 'engineeringSpecService.saveSpec')
  },

  patchSpec: async (id: string, delta: Record<string, unknown>, version: number): Promise<EngineeringSpec> => {
    const payload = engineeringSpecPatchRequestSchema.parse({ delta, version })
    const res = await apiFetch<EngineeringSpecApiDTO>(`/engineering/specs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        op: 'PATCH',
        delta: payload.delta,
        metadata: {
          id,
          version: payload.version,
        },
      }),
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
