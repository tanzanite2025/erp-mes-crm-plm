import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { type Customer } from '../../data/schema'

export const CUSTOMER_TRANSACTION_INTENT_STATUS_CHANGE = 'CUSTOMER_STATUS_CHANGE'
export const CUSTOMER_TRANSACTION_INTENT_IDENTITY_CHANGE = 'CUSTOMER_IDENTITY_CHANGE'

export interface CustomerTransactionRequest<TPayload> {
  intent: string
  actorId?: string
  expectedVersion: number
  payload: TPayload
}

export interface CustomerStatusChangePayload {
  status: string
  operator: string
}

export interface CustomerIdentityChangePayload {
  code?: string
  name?: string
  operator: string
}

export const getCustomers = async (): Promise<Customer[]> => {
  const res = await apiFetch<Customer[]>('/customers?options=true')
  return ensureArrayResponse<Customer>(res, 'CustomerService.getCustomers')
}

export const executeCustomerTransaction = async <TPayload>(
  customerId: string,
  request: CustomerTransactionRequest<TPayload>
): Promise<Customer> => {
  const res = await apiFetch<Customer>(`/customers/${customerId}/transactions`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return ensureObjectResponse<Customer & Record<string, unknown>>(
    res,
    'CustomerService.executeCustomerTransaction'
  ) as Customer
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

export const changeCustomerStatus = async (
  customerId: string,
  params: {
    status: string
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<Customer> => {
  return executeCustomerTransaction<CustomerStatusChangePayload>(customerId, {
    intent: CUSTOMER_TRANSACTION_INTENT_STATUS_CHANGE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      status: params.status,
      operator: params.operator,
    },
  })
}

export const changeCustomerIdentity = async (
  customerId: string,
  params: {
    code?: string
    name?: string
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<Customer> => {
  return executeCustomerTransaction<CustomerIdentityChangePayload>(customerId, {
    intent: CUSTOMER_TRANSACTION_INTENT_IDENTITY_CHANGE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      code: params.code,
      name: params.name,
      operator: params.operator,
    },
  })
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
