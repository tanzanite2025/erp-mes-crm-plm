import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { deserializeLedgerSearchResponseApiDTO } from '../../contracts/ledger-search-api-dto'
import {
  buildLedgerSearchUrl,
  type LedgerSearchQueryParams,
} from '../../services/ledger-search-query'
import {
  toReceivableListPageContract,
  type PaginatedReceivables,
} from '../adapters/receivable-api-adapter'
import {
  deserializeReceivableListPageApiDTO,
  type ReceivableLedgerSearchCandidateApiDTO,
  type ReceivableLedgerSearchResponseApiDTO,
  type ReceivableListPageApiDTO,
} from '../contracts/receivable-api-dto'

export type ReceivableLedgerSearchParams = LedgerSearchQueryParams

export interface ReceivableListQueryParams {
  sourceType?: string
  sourceRefId?: string
}

function buildReceivableListUrl(params: ReceivableListQueryParams): string {
  const searchParams = new URLSearchParams()
  if (params.sourceType?.trim()) {
    searchParams.set('sourceType', params.sourceType.trim())
  }
  if (params.sourceRefId?.trim()) {
    searchParams.set('sourceRefId', params.sourceRefId.trim())
  }
  const query = searchParams.toString()
  return query ? `/receivables?${query}` : '/receivables'
}

export async function getReceivables(
  params: ReceivableListQueryParams = {}
): Promise<PaginatedReceivables> {
  const res = await apiFetch<ReceivableListPageApiDTO>(
    buildReceivableListUrl(params)
  )
  const payload = ensureObjectResponse<
    ReceivableListPageApiDTO & Record<string, unknown>
  >(res, 'ReceivablesQueryService.getReceivables') as ReceivableListPageApiDTO
  return toReceivableListPageContract(
    deserializeReceivableListPageApiDTO(payload)
  )
}

export async function searchReceivableLedgers(
  params: ReceivableLedgerSearchParams
): Promise<ReceivableLedgerSearchCandidateApiDTO[]> {
  const res = await apiFetch<ReceivableLedgerSearchResponseApiDTO>(
    buildLedgerSearchUrl('/receivables/search', params)
  )
  const payload = ensureObjectResponse<
    ReceivableLedgerSearchResponseApiDTO & Record<string, unknown>
  >(
    res,
    'ReceivablesQueryService.searchReceivableLedgers'
  ) as ReceivableLedgerSearchResponseApiDTO
  return deserializeLedgerSearchResponseApiDTO(payload).items
}
