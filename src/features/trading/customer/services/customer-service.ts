import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { type Customer } from '../../data/schema'

export const getCustomers = async (): Promise<Customer[]> => {
  const res = await apiFetch<Customer[]>('/customers?options=true')
  return ensureArrayResponse<Customer>(res, 'CustomerService.getCustomers')
}

export const createCustomer = async (customer: Omit<Customer, 'id' | 'version'>): Promise<Customer> => {
  const res = await apiFetch<Customer>('/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  })
  return ensureObjectResponse<Customer & Record<string, unknown>>(res, 'CustomerService.createCustomer') as Customer
}

export const deleteCustomer = async (id: string): Promise<void> => {
  await apiFetch<void>(`/customers/${id}`, { method: 'DELETE' })
}

export const patchCustomer = async (id: string, delta: DeltaSet, version: number): Promise<Customer> => {
  const payload: DeltaPayload = {
    op: 'PATCH',
    delta,
    metadata: { id, version },
  }

  const res = await apiFetch<Customer>(`/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return ensureObjectResponse<Customer & Record<string, unknown>>(res, 'CustomerService.patchCustomer') as Customer
}
