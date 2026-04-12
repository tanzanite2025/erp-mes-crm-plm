import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  toReceivableListPageContract,
  type PaginatedReceivables,
} from '../adapters/receivable-api-adapter'
import type {
  ReceivableLedgerSearchCandidateApiDTO,
  ReceivableLedgerSearchResponseApiDTO,
  ReceivableListPageApiDTO,
} from '../contracts/receivable-api-dto'

export interface ReceivableLedgerSearchParams {
  keyword: string
  status: string
  currency: string
  outstandingMin: string
  outstandingMax: string
  sortBy: string
  sortOrder: string
}

export async function getReceivables(): Promise<PaginatedReceivables> {
  const res = await apiFetch<ReceivableListPageApiDTO>('/receivables')
  return toReceivableListPageContract(
    ensureObjectResponse<ReceivableListPageApiDTO & Record<string, unknown>>(
      res,
      'ReceivablesQueryService.getReceivables'
    ) as ReceivableListPageApiDTO
  )
}

export async function searchReceivableLedgers(params: ReceivableLedgerSearchParams): Promise<ReceivableLedgerSearchCandidateApiDTO[]> {
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
  const res = await apiFetch<ReceivableLedgerSearchResponseApiDTO>(`/receivables/search?${query.toString()}`)
  const payload = ensureObjectResponse<ReceivableLedgerSearchResponseApiDTO & Record<string, unknown>>(
    res,
    'ReceivablesQueryService.searchReceivableLedgers'
  ) as ReceivableLedgerSearchResponseApiDTO
  return payload.items ?? []
}
