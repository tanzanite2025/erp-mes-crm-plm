import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import type {
  CreateReceiptRecordApiDTO,
  CreateReceiptRecordResponseApiDTO,
  ReceivableDetailApiDTO,
} from '../contracts/receivable-api-dto'

export async function getReceivableLedgerDetail(id: string): Promise<ReceivableDetailApiDTO> {
  const res = await apiFetch<ReceivableDetailApiDTO>(`/receivables/${id}`)
  return ensureObjectResponse<ReceivableDetailApiDTO & Record<string, unknown>>(
    res,
    'ReceivableLedgerDetailService.getReceivableLedgerDetail'
  ) as ReceivableDetailApiDTO
}

export async function createReceiptRecord(
  id: string,
  payload: CreateReceiptRecordApiDTO,
): Promise<CreateReceiptRecordResponseApiDTO> {
  const res = await apiFetch<CreateReceiptRecordResponseApiDTO>(`/receivables/${id}/receipts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return ensureObjectResponse<CreateReceiptRecordResponseApiDTO & Record<string, unknown>>(
    res,
    'ReceivableLedgerDetailService.createReceiptRecord'
  ) as CreateReceiptRecordResponseApiDTO
}
