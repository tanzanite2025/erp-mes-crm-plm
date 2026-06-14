import type {
  PayableListPageApiDTO,
  PayableRecordApiDTO,
  PayableSummaryApiDTO,
} from '../contracts/payable-api-dto'

export interface PayableRecord {
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

export interface PayableSummary {
  totalPayable: number
  overduePayable: number
  pendingPaymentCount: number
}

export interface PaginatedPayables {
  items: PayableRecord[]
  total: number
  page: number
  pageSize: number
  summary: PayableSummary
}

export function toPayableRecordContract(
  dto: PayableRecordApiDTO
): PayableRecord {
  return {
    id: dto.id,
    documentNo: dto.documentNo,
    supplierName: dto.supplierName,
    currency: dto.currency,
    invoiceAmount: dto.invoiceAmount,
    paidAmount: dto.paidAmount,
    outstandingAmount: dto.outstandingAmount,
    dueDate: dto.dueDate,
    agingBucket: dto.agingBucket,
    status: dto.status,
  }
}

export function toPayableSummaryContract(
  dto: PayableSummaryApiDTO
): PayableSummary {
  return {
    totalPayable: dto.totalPayable,
    overduePayable: dto.overduePayable,
    pendingPaymentCount: dto.pendingPaymentCount,
  }
}

export function toPayableListPageContract(
  dto: PayableListPageApiDTO
): PaginatedPayables {
  return {
    items: dto.items.map(toPayableRecordContract),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    summary: toPayableSummaryContract(dto.summary),
  }
}
