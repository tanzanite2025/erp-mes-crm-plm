import { apiFetch } from '@/lib/api-client'
import {
  ensureArrayField,
  ensureNumberField,
  ensureObjectField,
  ensureObjectResponse,
} from '@/lib/api-response'
import {
  toOutsourcePartnerApiDTO,
  toOutsourcePartnerContract,
  toOutsourcePartnerContracts,
} from '../adapters/outsource-partner-api-adapter'
import type {
  OutsourcePartnerApiDTO,
  OutsourcePartnerListApiResponseDTO,
} from '../contracts/outsource-partner-api-dto'
import {
  outsourcePartnerArraySchema,
  outsourcePartnerSchema,
  type OutsourcePartner,
  type OutsourcePartnerFormValues,
  type OutsourcePartnerListResponse,
} from '../data/outsource-partner'
import type { OutsourcePartnerFilters } from '../query-keys'

function buildPartnerListQuery(filters: OutsourcePartnerFilters) {
  const params = new URLSearchParams()
  const search = filters.search?.trim()
  if (search) {
    params.set('search', search)
  }
  if (filters.status && filters.status !== 'ALL') {
    params.set('status', filters.status)
  }
  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

export async function getOutsourcePartners(
  filters: OutsourcePartnerFilters = {}
): Promise<OutsourcePartnerListResponse> {
  const context = 'OutsourcePartnersService.getOutsourcePartners'
  const raw = await apiFetch<OutsourcePartnerListApiResponseDTO>(
    `/production/outsourcing/partners${buildPartnerListQuery(filters)}`
  )
  const objectResponse = ensureObjectResponse<
    OutsourcePartnerListApiResponseDTO & Record<string, unknown>
  >(raw, context)
  const metadata = ensureObjectField<Record<string, unknown>>(
    objectResponse,
    'metadata',
    context
  )
  const items = outsourcePartnerArraySchema.parse(
    toOutsourcePartnerContracts(
      ensureArrayField<OutsourcePartnerApiDTO>(objectResponse, 'items', context)
    )
  )

  return {
    items,
    metadata: {
      total: ensureNumberField(metadata, 'total', context),
      active: ensureNumberField(metadata, 'active', context),
      onReview: ensureNumberField(metadata, 'onReview', context),
      inactive: ensureNumberField(metadata, 'inactive', context),
    },
  }
}

export async function createOutsourcePartner(
  values: OutsourcePartnerFormValues
): Promise<OutsourcePartner> {
  const response = await apiFetch<OutsourcePartnerApiDTO>(
    '/production/outsourcing/partners',
    {
      method: 'POST',
      body: JSON.stringify(toOutsourcePartnerApiDTO(values)),
    }
  )
  return outsourcePartnerSchema.parse(
    toOutsourcePartnerContract(
      ensureObjectResponse<OutsourcePartnerApiDTO & Record<string, unknown>>(
        response,
        'OutsourcePartnersService.createOutsourcePartner'
      )
    )
  )
}

export async function updateOutsourcePartner(
  partner: OutsourcePartner,
  values: OutsourcePartnerFormValues
): Promise<OutsourcePartner> {
  const response = await apiFetch<OutsourcePartnerApiDTO>(
    `/production/outsourcing/partners/${partner.id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(toOutsourcePartnerApiDTO(values, partner)),
    }
  )
  return outsourcePartnerSchema.parse(
    toOutsourcePartnerContract(
      ensureObjectResponse<OutsourcePartnerApiDTO & Record<string, unknown>>(
        response,
        'OutsourcePartnersService.updateOutsourcePartner'
      )
    )
  )
}

export async function deleteOutsourcePartner(id: string): Promise<void> {
  await apiFetch<void>(`/production/outsourcing/partners/${id}`, {
    method: 'DELETE',
  })
}
