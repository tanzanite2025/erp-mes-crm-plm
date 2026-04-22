import {
  deserializeCreateSettlementRecordApiDTO,
  type CreateSettlementRecordApiDTO,
} from '../../contracts/settlement-record-api-dto'

export interface SettlementAllocationDraft {
  allocatedAmount: string
  ledgerId: string
  remark: string
  sequenceNo: number
}

export interface SettlementRecordFormValues {
  allocations: SettlementAllocationDraft[]
  amount: number
  paymentMethod: string
  recordDate: string
  receivedAt: string
  receiptAccount: string
  referenceNo: string
}

function normalizeOptionalString(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function buildSettlementRecordPayload(values: SettlementRecordFormValues): CreateSettlementRecordApiDTO {
  const payload = {
    amount: values.amount,
    paymentMethod: normalizeOptionalString(values.paymentMethod),
    recordDate: normalizeOptionalString(values.recordDate),
    receivedAt: normalizeOptionalString(values.receivedAt),
    receiptAccount: normalizeOptionalString(values.receiptAccount),
    referenceNo: normalizeOptionalString(values.referenceNo),
    allocations: values.allocations.map((item, index) => ({
      ledgerId: item.ledgerId.trim(),
      allocatedAmount: Number(item.allocatedAmount),
      sequenceNo: item.sequenceNo || index + 1,
      remark: normalizeOptionalString(item.remark),
    })),
  }

  return deserializeCreateSettlementRecordApiDTO(payload)
}
