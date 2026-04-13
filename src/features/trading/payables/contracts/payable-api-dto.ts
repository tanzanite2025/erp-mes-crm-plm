import type { SettlementRecordEvidenceApiDTO } from '../../settlement-evidences/contracts/settlement-evidence-api-dto'

export interface PayableRecordApiDTO {
  id: string
  documentNo: string
  supplierName: string
  currency: string
  invoiceAmount: number
  paidAmount: number
  outstandingAmount: number
  dueDate: string
  agingBucket: string
  status: string
}

export interface PayableSummaryApiDTO {
  totalPayable: number
  overduePayable: number
  pendingPaymentCount: number
}

export interface PayableListPageApiDTO {
  items: PayableRecordApiDTO[]
  total: number
  page: number
  pageSize: number
  summary: PayableSummaryApiDTO
}

export interface PayableLedgerSearchCandidateApiDTO {
  id: string
  documentNo: string
  partnerName: string
  outstandingAmount: number
  status: string
  currency: string
}

export interface PayableLedgerSearchResponseApiDTO {
  items: PayableLedgerSearchCandidateApiDTO[]
  total: number
  page: number
  pageSize: number
}

export interface PaymentRecordApiDTO {
  id: string
  recordNo: string
  ledgerId: string
  amount: number
  currency: string
  paymentMethod: string
  paymentTerm: string
  recordDate: string
  status: string
  referenceNo: string
  createdAt: string
  updatedAt: string
  evidences: SettlementRecordEvidenceApiDTO[]
}

export interface SettlementAllocationApiDTO {
  id: string
  ledgerId: string
  receiptRecordId: string
  paymentRecordId: string
  allocatedAmount: number
  sequenceNo: number
  remark: string
  operator: string
  createdAt: string
  updatedAt: string
}

export interface PayableDetailApiDTO extends PayableRecordApiDTO {
  sourceType: string
  sourceRefId: string
  supplierId: string
  supplierName: string
  invoiceAmount: number
  paidAmount: number
  outstandingAmount: number
  dueDate: string
  agingBucket: string
  version: number
  paymentRecords: PaymentRecordApiDTO[]
  allocations: SettlementAllocationApiDTO[]
  documentNo: string
  status: string
  currency: string
}

export interface CreatePaymentRecordApiDTO {
  amount: number
  currency?: string
  paymentMethod?: string
  paymentTerm?: string
  recordDate?: string
  referenceNo?: string
  allocations: Array<{
    ledgerId: string
    allocatedAmount: number
    sequenceNo?: number
    remark?: string
  }>
}

export interface CreatePaymentRecordResponseApiDTO {
  ledger: PayableDetailApiDTO
  record: PaymentRecordApiDTO
  allocations: SettlementAllocationApiDTO[]
}
