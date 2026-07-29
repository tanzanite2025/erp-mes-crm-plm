import { apiFetch } from '@/lib/api-client'
import {
  ensureArrayField,
  ensureNumberField,
  ensureObjectField,
  ensureObjectResponse,
} from '@/lib/api-response'
import {
  toOutsourceOrderApiDTO,
  toOutsourceOrderContract,
  toOutsourceOrderContracts,
} from '../adapters/outsource-order-api-adapter'
import type {
  OutsourceDiagnosticsApiResponseDTO,
  OutsourceOrderApiDTO,
  OutsourceInspectionActionApiResponseDTO,
  OutsourceOrderListApiResponseDTO,
  OutsourceTransferActionApiResponseDTO,
} from '../contracts/outsource-order-api-dto'
import {
  outsourceDiagnosticsResponseSchema,
  outsourceOrderArraySchema,
  outsourceOrderSchema,
  type OutsourceDiagnosticsResponse,
  type OutsourceOrder,
  type OutsourceOrderFormValues,
  type OutsourceInspectionFormValues,
  type OutsourceOrderListResponse,
  type OutsourceTransferFormValues,
} from '../data/outsource-order'
import type { OutsourceOrderFilters } from '../query-keys'

function buildOrderListQuery(filters: OutsourceOrderFilters) {
  const params = new URLSearchParams()
  const search = filters.search?.trim()
  if (search) {
    params.set('search', search)
  }
  if (filters.status && filters.status !== 'ALL') {
    params.set('status', filters.status)
  }
  if (filters.sourceType && filters.sourceType !== 'ALL') {
    params.set('sourceType', filters.sourceType)
  }
  if (filters.partnerId?.trim()) {
    params.set('partnerId', filters.partnerId.trim())
  }
  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

export async function getOutsourceOrders(
  filters: OutsourceOrderFilters = {}
): Promise<OutsourceOrderListResponse> {
  const context = 'OutsourceOrdersService.getOutsourceOrders'
  const raw = await apiFetch<OutsourceOrderListApiResponseDTO>(
    `/production/outsourcing/orders${buildOrderListQuery(filters)}`
  )
  const objectResponse = ensureObjectResponse<
    OutsourceOrderListApiResponseDTO & Record<string, unknown>
  >(raw, context)
  const metadata = ensureObjectField<Record<string, unknown>>(
    objectResponse,
    'metadata',
    context
  )
  const items = outsourceOrderArraySchema.parse(
    toOutsourceOrderContracts(
      ensureArrayField<OutsourceOrderApiDTO>(objectResponse, 'items', context)
    )
  )

  return {
    items,
    metadata: {
      total: ensureNumberField(metadata, 'total', context),
      draft: ensureNumberField(metadata, 'draft', context),
      released: ensureNumberField(metadata, 'released', context),
      active: ensureNumberField(metadata, 'active', context),
      returned: ensureNumberField(metadata, 'returned', context),
      closed: ensureNumberField(metadata, 'closed', context),
      canceled: ensureNumberField(metadata, 'canceled', context),
      salesOrder: ensureNumberField(metadata, 'salesOrder', context),
      production: ensureNumberField(metadata, 'production', context),
    },
  }
}

export async function getOutsourceDiagnostics(): Promise<OutsourceDiagnosticsResponse> {
  const response = await apiFetch<OutsourceDiagnosticsApiResponseDTO>(
    '/production/outsourcing/diagnostics'
  )
  return outsourceDiagnosticsResponseSchema.parse(
    ensureObjectResponse<
      OutsourceDiagnosticsApiResponseDTO & Record<string, unknown>
    >(response, 'OutsourceOrdersService.getOutsourceDiagnostics')
  )
}

export async function createOutsourceOrder(
  values: OutsourceOrderFormValues
): Promise<OutsourceOrder> {
  const response = await apiFetch<OutsourceOrderApiDTO>(
    '/production/outsourcing/orders',
    {
      method: 'POST',
      body: JSON.stringify(toOutsourceOrderApiDTO(values)),
    }
  )
  return outsourceOrderSchema.parse(
    toOutsourceOrderContract(
      ensureObjectResponse<OutsourceOrderApiDTO & Record<string, unknown>>(
        response,
        'OutsourceOrdersService.createOutsourceOrder'
      )
    )
  )
}

export async function updateOutsourceOrder(
  order: OutsourceOrder,
  values: OutsourceOrderFormValues
): Promise<OutsourceOrder> {
  const response = await apiFetch<OutsourceOrderApiDTO>(
    `/production/outsourcing/orders/${order.id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(toOutsourceOrderApiDTO(values, order)),
    }
  )
  return outsourceOrderSchema.parse(
    toOutsourceOrderContract(
      ensureObjectResponse<OutsourceOrderApiDTO & Record<string, unknown>>(
        response,
        'OutsourceOrdersService.updateOutsourceOrder'
      )
    )
  )
}

export async function releaseOutsourceOrder(
  order: OutsourceOrder
): Promise<OutsourceOrder> {
  const response = await apiFetch<OutsourceOrderApiDTO>(
    `/production/outsourcing/orders/${order.id}/release`,
    {
      method: 'POST',
    }
  )
  return outsourceOrderSchema.parse(
    toOutsourceOrderContract(
      ensureObjectResponse<OutsourceOrderApiDTO & Record<string, unknown>>(
        response,
        'OutsourceOrdersService.releaseOutsourceOrder'
      )
    )
  )
}

export async function cancelOutsourceOrder(
  order: OutsourceOrder
): Promise<OutsourceOrder> {
  const response = await apiFetch<OutsourceOrderApiDTO>(
    `/production/outsourcing/orders/${order.id}/cancel`,
    {
      method: 'POST',
    }
  )
  return outsourceOrderSchema.parse(
    toOutsourceOrderContract(
      ensureObjectResponse<OutsourceOrderApiDTO & Record<string, unknown>>(
        response,
        'OutsourceOrdersService.cancelOutsourceOrder'
      )
    )
  )
}

export async function deleteOutsourceOrder(id: string): Promise<void> {
  await apiFetch<void>(`/production/outsourcing/orders/${id}`, {
    method: 'DELETE',
  })
}

export async function sendOutsourceOrderLine(
  lineId: string,
  values: OutsourceTransferFormValues
): Promise<OutsourceOrder> {
  const response = await apiFetch<OutsourceTransferActionApiResponseDTO>(
    `/production/outsourcing/order-lines/${lineId}/send`,
    {
      method: 'POST',
      body: JSON.stringify(values),
    }
  )
  const objectResponse = ensureObjectResponse<
    OutsourceTransferActionApiResponseDTO & Record<string, unknown>
  >(response, 'OutsourceOrdersService.sendOutsourceOrderLine')
  return outsourceOrderSchema.parse(
    toOutsourceOrderContract(
      ensureObjectField<OutsourceOrderApiDTO & Record<string, unknown>>(
        objectResponse,
        'order',
        'OutsourceOrdersService.sendOutsourceOrderLine'
      )
    )
  )
}

export async function returnOutsourceOrderLine(
  lineId: string,
  values: OutsourceTransferFormValues
): Promise<OutsourceOrder> {
  const response = await apiFetch<OutsourceTransferActionApiResponseDTO>(
    `/production/outsourcing/order-lines/${lineId}/return`,
    {
      method: 'POST',
      body: JSON.stringify(values),
    }
  )
  const objectResponse = ensureObjectResponse<
    OutsourceTransferActionApiResponseDTO & Record<string, unknown>
  >(response, 'OutsourceOrdersService.returnOutsourceOrderLine')
  return outsourceOrderSchema.parse(
    toOutsourceOrderContract(
      ensureObjectField<OutsourceOrderApiDTO & Record<string, unknown>>(
        objectResponse,
        'order',
        'OutsourceOrdersService.returnOutsourceOrderLine'
      )
    )
  )
}

export async function inspectOutsourceOrderLine(
  lineId: string,
  values: OutsourceInspectionFormValues
): Promise<OutsourceOrder> {
  const response = await apiFetch<OutsourceInspectionActionApiResponseDTO>(
    `/production/outsourcing/order-lines/${lineId}/inspect`,
    {
      method: 'POST',
      body: JSON.stringify(values),
    }
  )
  const objectResponse = ensureObjectResponse<
    OutsourceInspectionActionApiResponseDTO & Record<string, unknown>
  >(response, 'OutsourceOrdersService.inspectOutsourceOrderLine')
  return outsourceOrderSchema.parse(
    toOutsourceOrderContract(
      ensureObjectField<OutsourceOrderApiDTO & Record<string, unknown>>(
        objectResponse,
        'order',
        'OutsourceOrdersService.inspectOutsourceOrderLine'
      )
    )
  )
}
