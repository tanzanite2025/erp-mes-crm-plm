import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { deserializeLedgerSearchResponseApiDTO } from '../../contracts/ledger-search-api-dto'
import {
  buildLedgerSearchUrl,
  type LedgerSearchQueryParams,
} from '../../services/ledger-search-query'
import {
  toPayableListPageContract,
  type PaginatedPayables,
} from '../adapters/payable-api-adapter'
import {
  deserializePayableListPageApiDTO,
  type PayableLedgerSearchCandidateApiDTO,
  type PayableLedgerSearchResponseApiDTO,
  type PayableListPageApiDTO,
} from '../contracts/payable-api-dto'

export type PayableLedgerSearchParams = LedgerSearchQueryParams

export interface PayableListQueryParams {
  sourceType?: string
  sourceRefId?: string
}

function buildPayableListUrl(params: PayableListQueryParams): string {
  const searchParams = new URLSearchParams()
  if (params.sourceType?.trim()) {
    searchParams.set('sourceType', params.sourceType.trim())
  }
  if (params.sourceRefId?.trim()) {
    searchParams.set('sourceRefId', params.sourceRefId.trim())
  }
  const query = searchParams.toString()
  return query ? `/payables?${query}` : '/payables'
}

export async function getPayables(
  params: PayableListQueryParams = {}
): Promise<PaginatedPayables> {
  const res = await apiFetch<PayableListPageApiDTO>(buildPayableListUrl(params))
  const payload = ensureObjectResponse<
    PayableListPageApiDTO & Record<string, unknown>
  >(res, 'PayablesQueryService.getPayables') as PayableListPageApiDTO
  return toPayableListPageContract(deserializePayableListPageApiDTO(payload))
}

export async function searchPayableLedgers(
  params: PayableLedgerSearchParams
): Promise<PayableLedgerSearchCandidateApiDTO[]> {
  const res = await apiFetch<PayableLedgerSearchResponseApiDTO>(
    buildLedgerSearchUrl('/payables/search', params)
  )
  const payload = ensureObjectResponse<
    PayableLedgerSearchResponseApiDTO & Record<string, unknown>
  >(
    res,
    'PayablesQueryService.searchPayableLedgers'
  ) as PayableLedgerSearchResponseApiDTO
  return deserializeLedgerSearchResponseApiDTO(payload).items
}
