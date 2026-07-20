import { apiFetch } from '@/lib/api-client'
import {
  ensureArrayField,
  ensureArrayResponse,
  ensureNumberField,
  ensureObjectField,
  ensureObjectResponse,
} from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { buildVersionedPatchMetadata } from '@/lib/version-guard'
import {
  toSupplierApiDTO,
  toSupplierContract,
  toSupplierContracts,
} from '../adapters/supplier-api-adapter'
import {
  type SupplierApiDTO,
  type SupplierListApiResponseDTO,
} from '../contracts/supplier-api-dto'
import {
  supplierArraySchema,
  supplierSchema,
  type Supplier,
  type SupplierFormValues,
} from '../data/schema'

export const SUPPLIER_TRANSACTION_INTENT_STATUS_CHANGE =
  'SUPPLIER_STATUS_CHANGE'
export const SUPPLIER_TRANSACTION_INTENT_IDENTITY_CHANGE =
  'SUPPLIER_IDENTITY_CHANGE'
export const SUPPLIER_TRANSACTION_INTENT_SAVE = 'SUPPLIER_SAVE'
export const SUPPLIER_PATCH_INTENT_SAVE = 'SUPPLIER_PATCH_SAVE'

export interface SupplierListStats {
  total: number
  active: number
  pendingReview: number
}

export interface SupplierListResponse {
  items: Supplier[]
  total: number
  page: number
  pageSize: number
  metadata: {
    pagination: {
      total: number
      page: number
      pageSize: number
    }
    stats: SupplierListStats
  }
}

export interface SupplierTransactionRequest<TPayload> {
  intent: string
  actorId?: string
  expectedVersion: number
  payload: TPayload
}

export interface SupplierStatusChangePayload {
  status: string
  operator: string
}

export interface SupplierIdentityChangePayload {
  code?: string
  name?: string
  operator: string
}

export interface SupplierSavePayload {
  delta: DeltaSet
  finalData: Supplier
  operator: string
}

export const getSuppliers = async (): Promise<Supplier[]> => {
  const raw = await apiFetch<SupplierApiDTO[]>('/suppliers?options=true')
  return supplierArraySchema.parse(
    toSupplierContracts(
      ensureArrayResponse<SupplierApiDTO>(raw, 'SupplierService.getSuppliers')
    )
  )
}

export const getSupplierList = async (): Promise<SupplierListResponse> => {
  const context = 'SupplierService.getSupplierList'
  const res = await apiFetch<SupplierListApiResponseDTO>('/suppliers')
  const objectResponse = ensureObjectResponse<
    SupplierListApiResponseDTO & Record<string, unknown>
  >(res, context)
  const items = supplierArraySchema.parse(
    toSupplierContracts(
      ensureArrayField<SupplierApiDTO>(objectResponse, 'items', context)
    )
  )
  const total = ensureNumberField(objectResponse, 'total', context)
  const page = ensureNumberField(objectResponse, 'page', context)
  const pageSize = ensureNumberField(objectResponse, 'pageSize', context)
  const metadata = ensureObjectField<Record<string, unknown>>(
    objectResponse,
    'metadata',
    context
  )
  const pagination = ensureObjectField<Record<string, unknown>>(
    metadata,
    'pagination',
    context
  )
  const stats = ensureObjectField<Record<string, unknown>>(
    metadata,
    'stats',
    context
  )

  return {
    items,
    total,
    page,
    pageSize,
    metadata: {
      pagination: {
        total: ensureNumberField(pagination, 'total', context),
        page: ensureNumberField(pagination, 'page', context),
        pageSize: ensureNumberField(pagination, 'pageSize', context),
      },
      stats: {
        total: ensureNumberField(stats, 'total', context),
        active: ensureNumberField(stats, 'active', context),
        pendingReview: ensureNumberField(stats, 'pendingReview', context),
      },
    },
  }
}

export const executeSupplierTransaction = async <TPayload>(
  supplierId: string,
  request: SupplierTransactionRequest<TPayload>
): Promise<Supplier> => {
  const res = await apiFetch<SupplierApiDTO>(
    `/suppliers/${supplierId}/transactions`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  )
  return supplierSchema.parse(
    toSupplierContract(
      ensureObjectResponse<SupplierApiDTO & Record<string, unknown>>(
        res,
        'SupplierService.executeSupplierTransaction'
      ) as SupplierApiDTO
    )
  )
}

export const createSupplier = async (
  supplier: SupplierFormValues
): Promise<Supplier> => {
  const res = await apiFetch<SupplierApiDTO>('/suppliers', {
    method: 'POST',
    body: JSON.stringify(
      toSupplierApiDTO({ ...supplier, id: '', version: 1 } as Supplier)
    ),
  })
  return supplierSchema.parse(
    toSupplierContract(
      ensureObjectResponse<SupplierApiDTO & Record<string, unknown>>(
        res,
        'SupplierService.createSupplier'
      ) as SupplierApiDTO
    )
  )
}

export const deleteSupplier = async (id: string): Promise<void> => {
  await apiFetch<void>(`/suppliers/${id}`, { method: 'DELETE' })
}

export const changeSupplierStatus = async (
  supplierId: string,
  params: {
    status: string
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<Supplier> => {
  return executeSupplierTransaction<SupplierStatusChangePayload>(supplierId, {
    intent: SUPPLIER_TRANSACTION_INTENT_STATUS_CHANGE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      status: params.status,
      operator: params.operator,
    },
  })
}

export const changeSupplierIdentity = async (
  supplierId: string,
  params: {
    code?: string
    name?: string
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<Supplier> => {
  return executeSupplierTransaction<SupplierIdentityChangePayload>(supplierId, {
    intent: SUPPLIER_TRANSACTION_INTENT_IDENTITY_CHANGE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      code: params.code,
      name: params.name,
      operator: params.operator,
    },
  })
}

export const saveSupplier = async (
  supplierId: string,
  params: {
    delta: DeltaSet
    finalData: Supplier
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<Supplier> => {
  return executeSupplierTransaction<SupplierSavePayload>(supplierId, {
    intent: SUPPLIER_TRANSACTION_INTENT_SAVE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      delta: params.delta,
      finalData: params.finalData,
      operator: params.operator,
    },
  })
}

export const patchSupplier = async (
  id: string,
  delta: DeltaSet,
  version: number
): Promise<Supplier> => {
  const payload: DeltaPayload = {
    op: 'PATCH',
    delta,
    metadata: buildVersionedPatchMetadata(
      id,
      version,
      'SupplierService.patchSupplier',
      {
        intent: SUPPLIER_PATCH_INTENT_SAVE,
      }
    ),
  }

  const res = await apiFetch<SupplierApiDTO>(`/suppliers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return supplierSchema.parse(
    toSupplierContract(
      ensureObjectResponse<SupplierApiDTO & Record<string, unknown>>(
        res,
        'SupplierService.patchSupplier'
      ) as SupplierApiDTO
    )
  )
}
