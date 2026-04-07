import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { type Supplier } from '../../data/schema'

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
