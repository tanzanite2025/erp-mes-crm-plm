import { apiFetch } from '@/lib/api-client'
import {
  ensureArrayField,
  ensureArrayResponse,
  ensureNumberField,
  ensureObjectField,
  ensureObjectResponse,
} from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { toCustomerApiDTO, toCustomerContract, toCustomerContracts } from '../adapters/customer-api-adapter'
import { type CustomerApiDTO, type CustomerListApiResponseDTO } from '../contracts/customer-api-dto'
import { customerArraySchema, customerSchema, type Customer } from '../../data/schema'

export const CUSTOMER_TRANSACTION_INTENT_STATUS_CHANGE = 'CUSTOMER_STATUS_CHANGE'
export const CUSTOMER_TRANSACTION_INTENT_IDENTITY_CHANGE = 'CUSTOMER_IDENTITY_CHANGE'
export const CUSTOMER_TRANSACTION_INTENT_SAVE = 'CUSTOMER_SAVE'

export interface CustomerListStats {
  total: number
  active: number
  newThisMonth: number
}

export interface CustomerListResponse {
  items: Customer[]
  total: number
  page: number
  pageSize: number
  metadata: {
    pagination: {
      total: number
      page: number
      pageSize: number
    }
    stats: CustomerListStats
  }
}

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

export interface CustomerSavePayload {
  delta: DeltaSet
  finalData: Customer
  operator: string
}

export const getCustomers = async (): Promise<Customer[]> => {
  const res = await apiFetch<CustomerApiDTO[]>('/customers?options=true')
  return customerArraySchema.parse(
    toCustomerContracts(ensureArrayResponse<CustomerApiDTO>(res, 'CustomerService.getCustomers'))
  )
}

export const getCustomerList = async (): Promise<CustomerListResponse> => {
  const context = 'CustomerService.getCustomerList'
  const res = await apiFetch<CustomerListApiResponseDTO>('/customers')
  const objectResponse = ensureObjectResponse<CustomerListApiResponseDTO & Record<string, unknown>>(
    res,
    context
  )
  const items = customerArraySchema.parse(
    toCustomerContracts(ensureArrayField<CustomerApiDTO>(objectResponse, 'items', context))
  )
  const total = ensureNumberField(objectResponse, 'total', context)
  const page = ensureNumberField(objectResponse, 'page', context)
  const pageSize = ensureNumberField(objectResponse, 'pageSize', context)
  const metadata = ensureObjectField<Record<string, unknown>>(objectResponse, 'metadata', context)
  const pagination = ensureObjectField<Record<string, unknown>>(metadata, 'pagination', context)
  const stats = ensureObjectField<Record<string, unknown>>(metadata, 'stats', context)

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
        newThisMonth: ensureNumberField(stats, 'newThisMonth', context),
      },
    },
  }
}

export const executeCustomerTransaction = async <TPayload>(
  customerId: string,
  request: CustomerTransactionRequest<TPayload>
): Promise<Customer> => {
  const res = await apiFetch<CustomerApiDTO>(`/customers/${customerId}/transactions`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return customerSchema.parse(
    toCustomerContract(
      ensureObjectResponse<CustomerApiDTO & Record<string, unknown>>(
        res,
        'CustomerService.executeCustomerTransaction'
      ) as CustomerApiDTO
    )
  )
}

export const createCustomer = async (customer: Omit<Customer, 'id' | 'version'>): Promise<Customer> => {
  const res = await apiFetch<CustomerApiDTO>('/customers', {
    method: 'POST',
    body: JSON.stringify(toCustomerApiDTO({ ...customer, id: '', version: 1 } as Customer)),
  })
  return customerSchema.parse(
    toCustomerContract(
      ensureObjectResponse<CustomerApiDTO & Record<string, unknown>>(res, 'CustomerService.createCustomer') as CustomerApiDTO
    )
  )
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

export const saveCustomer = async (
  customerId: string,
  params: {
    delta: DeltaSet
    finalData: Customer
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<Customer> => {
  return executeCustomerTransaction<CustomerSavePayload>(customerId, {
    intent: CUSTOMER_TRANSACTION_INTENT_SAVE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      delta: params.delta,
      finalData: params.finalData,
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

  const res = await apiFetch<CustomerApiDTO>(`/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return customerSchema.parse(
    toCustomerContract(
      ensureObjectResponse<CustomerApiDTO & Record<string, unknown>>(res, 'CustomerService.patchCustomer') as CustomerApiDTO
    )
  )
}
