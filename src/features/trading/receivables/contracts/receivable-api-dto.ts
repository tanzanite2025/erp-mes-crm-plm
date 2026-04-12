export interface ReceivableRecordApiDTO {
  id: string
  documentNo: string
  customerName: string
  currency: string
  invoiceAmount: number
  receivedAmount: number
  outstandingAmount: number
  dueDate: string
  agingBucket: string
  status: string
}

export interface ReceivableSummaryApiDTO {
  totalReceivable: number
  overdueReceivable: number
  pendingReceiptCount: number
}

export interface ReceivableListPageApiDTO {
  items: ReceivableRecordApiDTO[]
  total: number
  page: number
  pageSize: number
  summary: ReceivableSummaryApiDTO
}

export interface ReceivableLedgerSearchCandidateApiDTO {
  id: string
  documentNo: string
  partnerName: string
  outstandingAmount: number
  status: string
  currency: string
}

export interface ReceivableLedgerSearchResponseApiDTO {
  items: ReceivableLedgerSearchCandidateApiDTO[]
  total: number
  page: number
  pageSize: number
}

export interface ReceiptRecordApiDTO {
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

export interface ReceivableDetailApiDTO extends ReceivableRecordApiDTO {
  sourceType: string
  sourceRefId: string
  customerId: string
  version: number
  receiptRecords: ReceiptRecordApiDTO[]
  allocations: SettlementAllocationApiDTO[]
}

export interface CreateReceiptRecordApiDTO {
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

export interface CreateReceiptRecordResponseApiDTO {
  ledger: ReceivableDetailApiDTO
  record: ReceiptRecordApiDTO
  allocations: SettlementAllocationApiDTO[]
}
