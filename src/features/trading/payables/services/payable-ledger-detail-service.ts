import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import type {
  CreatePaymentRecordApiDTO,
  CreatePaymentRecordResponseApiDTO,
  PayableDetailApiDTO,
} from '../contracts/payable-api-dto'

export async function getPayableLedgerDetail(id: string): Promise<PayableDetailApiDTO> {
  const res = await apiFetch<PayableDetailApiDTO>(`/payables/${id}`)
  return ensureObjectResponse<PayableDetailApiDTO & Record<string, unknown>>(
    res,
    'PayableLedgerDetailService.getPayableLedgerDetail'
  ) as PayableDetailApiDTO
}

export async function createPaymentRecord(
  id: string,
  payload: CreatePaymentRecordApiDTO,
): Promise<CreatePaymentRecordResponseApiDTO> {
  const res = await apiFetch<CreatePaymentRecordResponseApiDTO>(`/payables/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return ensureObjectResponse<CreatePaymentRecordResponseApiDTO & Record<string, unknown>>(
    res,
    'PayableLedgerDetailService.createPaymentRecord'
  ) as CreatePaymentRecordResponseApiDTO
}
