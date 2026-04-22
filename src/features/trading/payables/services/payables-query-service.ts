import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { deserializeLedgerSearchResponseApiDTO } from '../../contracts/ledger-search-api-dto'
import { buildLedgerSearchUrl, type LedgerSearchQueryParams } from '../../services/ledger-search-query'
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

export async function getPayables(): Promise<PaginatedPayables> {
  const res = await apiFetch<PayableListPageApiDTO>('/payables')
  const payload = ensureObjectResponse<PayableListPageApiDTO & Record<string, unknown>>(
    res,
    'PayablesQueryService.getPayables'
  ) as PayableListPageApiDTO
  return toPayableListPageContract(deserializePayableListPageApiDTO(payload))
}

export async function searchPayableLedgers(params: PayableLedgerSearchParams): Promise<PayableLedgerSearchCandidateApiDTO[]> {
  const res = await apiFetch<PayableLedgerSearchResponseApiDTO>(
    buildLedgerSearchUrl('/payables/search', params)
  )
  const payload = ensureObjectResponse<PayableLedgerSearchResponseApiDTO & Record<string, unknown>>(
    res,
    'PayablesQueryService.searchPayableLedgers'
  ) as PayableLedgerSearchResponseApiDTO
  return deserializeLedgerSearchResponseApiDTO(payload).items
}
