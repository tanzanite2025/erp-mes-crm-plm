import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  toPayableListPageContract,
  type PaginatedPayables,
} from '../adapters/payable-api-adapter'
import type {
  PayableLedgerSearchCandidateApiDTO,
  PayableLedgerSearchResponseApiDTO,
  PayableListPageApiDTO,
} from '../contracts/payable-api-dto'

export interface PayableLedgerSearchParams {
  keyword: string
  status: string
  currency: string
  outstandingMin: string
  outstandingMax: string
  sortBy: string
  sortOrder: string
}

export async function getPayables(): Promise<PaginatedPayables> {
  const res = await apiFetch<PayableListPageApiDTO>('/payables')
  return toPayableListPageContract(
    ensureObjectResponse<PayableListPageApiDTO & Record<string, unknown>>(
      res,
      'PayablesQueryService.getPayables'
    ) as PayableListPageApiDTO
  )
}

export async function searchPayableLedgers(params: PayableLedgerSearchParams): Promise<PayableLedgerSearchCandidateApiDTO[]> {
  const query = new URLSearchParams({
    keyword: params.keyword,
    page: '1',
    pageSize: '20',
    status: params.status,
    currency: params.currency,
    outstandingMin: params.outstandingMin,
    outstandingMax: params.outstandingMax,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  })
  const res = await apiFetch<PayableLedgerSearchResponseApiDTO>(`/payables/search?${query.toString()}`)
  const payload = ensureObjectResponse<PayableLedgerSearchResponseApiDTO & Record<string, unknown>>(
    res,
    'PayablesQueryService.searchPayableLedgers'
  ) as PayableLedgerSearchResponseApiDTO
  return payload.items ?? []
}
