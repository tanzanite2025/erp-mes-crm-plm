import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { deserializeCreateSettlementRecordApiDTO } from '../../contracts/settlement-record-api-dto'
import {
  deserializeCreateReceiptRecordResponseApiDTO,
  deserializeReceivableDetailApiDTO,
  type CreateReceiptRecordApiDTO,
  type CreateReceiptRecordResponseApiDTO,
  type ReceivableDetailApiDTO,
} from '../contracts/receivable-api-dto'

export async function getReceivableLedgerDetail(id: string): Promise<ReceivableDetailApiDTO> {
  const res = await apiFetch<ReceivableDetailApiDTO>(`/receivables/${id}`)
  const payload = ensureObjectResponse<ReceivableDetailApiDTO & Record<string, unknown>>(
    res,
    'ReceivableLedgerDetailService.getReceivableLedgerDetail'
  ) as ReceivableDetailApiDTO
  return deserializeReceivableDetailApiDTO(payload)
}

export async function createReceiptRecord(
  id: string,
  payload: CreateReceiptRecordApiDTO,
): Promise<CreateReceiptRecordResponseApiDTO> {
  const request = deserializeCreateSettlementRecordApiDTO(payload)
  const res = await apiFetch<CreateReceiptRecordResponseApiDTO>(`/receivables/${id}/receipts`, {
    method: 'POST',
    body: JSON.stringify(request),
  })

  const response = ensureObjectResponse<CreateReceiptRecordResponseApiDTO & Record<string, unknown>>(
    res,
    'ReceivableLedgerDetailService.createReceiptRecord'
  ) as CreateReceiptRecordResponseApiDTO
  return deserializeCreateReceiptRecordResponseApiDTO(response)
}
