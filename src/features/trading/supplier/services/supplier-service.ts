import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { type Supplier } from '../../data/schema'

export const SUPPLIER_TRANSACTION_INTENT_STATUS_CHANGE = 'SUPPLIER_STATUS_CHANGE'
export const SUPPLIER_TRANSACTION_INTENT_IDENTITY_CHANGE = 'SUPPLIER_IDENTITY_CHANGE'

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

type SupplierListMeta = {
  total?: number
  page?: number
  pageSize?: number
}

export const getSuppliers = async (): Promise<Supplier[]> => {
  const raw = await apiFetch<Supplier[]>('/suppliers')
  const checkedRaw = ensureArrayResponse<Supplier>(raw, 'SupplierService.getSuppliers')
  const supplierListMeta = raw as Supplier[] & SupplierListMeta

  const result = checkedRaw.map((supplier) => ({
    ...supplier,
    mainProducts:
      typeof supplier.mainProducts === 'string'
        ? JSON.parse(supplier.mainProducts)
        : (supplier.mainProducts ?? []),
  }))

  if (supplierListMeta.total !== undefined) {
    Object.assign(result, {
      total: supplierListMeta.total,
      page: supplierListMeta.page,
      pageSize: supplierListMeta.pageSize,
    })
  }

  return result
}

export const executeSupplierTransaction = async <TPayload>(
  supplierId: string,
  request: SupplierTransactionRequest<TPayload>
): Promise<Supplier> => {
  const res = await apiFetch<Supplier>(`/suppliers/${supplierId}/transactions`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return ensureObjectResponse<Supplier & Record<string, unknown>>(
    res,
    'SupplierService.executeSupplierTransaction'
  ) as Supplier
}

export const createSupplier = async (supplier: Omit<Supplier, 'id' | 'version'>): Promise<Supplier> => {
  const payload = {
    ...supplier,
    mainProducts: supplier.mainProducts ? JSON.stringify(supplier.mainProducts) : '[]',
  }

  const res = await apiFetch<Supplier>('/suppliers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return ensureObjectResponse<Supplier & Record<string, unknown>>(res, 'SupplierService.createSupplier') as Supplier
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

export const patchSupplier = async (id: string, delta: DeltaSet, version: number): Promise<Supplier> => {
  const payload: DeltaPayload = {
    op: 'PATCH',
    delta,
    metadata: { id, version },
  }

  const res = await apiFetch<Supplier>(`/suppliers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return ensureObjectResponse<Supplier & Record<string, unknown>>(res, 'SupplierService.patchSupplier') as Supplier
}
