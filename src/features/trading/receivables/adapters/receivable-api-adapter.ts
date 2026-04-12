import type {
  ReceivableListPageApiDTO,
  ReceivableRecordApiDTO,
  ReceivableSummaryApiDTO,
} from '../contracts/receivable-api-dto'

export interface ReceivableRecord {
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

export interface ReceivableSummary {
  totalReceivable: number
  overdueReceivable: number
  pendingReceiptCount: number
}

export interface PaginatedReceivables {
  items: ReceivableRecord[]
  total: number
  page: number
  pageSize: number
  summary: ReceivableSummary
}

export function toReceivableRecordContract(dto: ReceivableRecordApiDTO): ReceivableRecord {
  return {
    id: dto.id,
    documentNo: dto.documentNo,
    customerName: dto.customerName,
    currency: dto.currency,
    invoiceAmount: dto.invoiceAmount,
    receivedAmount: dto.receivedAmount,
    outstandingAmount: dto.outstandingAmount,
    dueDate: dto.dueDate,
    agingBucket: dto.agingBucket,
    status: dto.status,
  }
}

export function toReceivableSummaryContract(dto: ReceivableSummaryApiDTO): ReceivableSummary {
  return {
    totalReceivable: dto.totalReceivable,
    overdueReceivable: dto.overdueReceivable,
    pendingReceiptCount: dto.pendingReceiptCount,
  }
}

export function toReceivableListPageContract(dto: ReceivableListPageApiDTO): PaginatedReceivables {
  return {
    items: (dto.items ?? []).map(toReceivableRecordContract),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    summary: toReceivableSummaryContract(dto.summary),
  }
}
