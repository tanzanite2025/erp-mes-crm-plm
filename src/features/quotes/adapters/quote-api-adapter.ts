import type { QuoteSummary, QuoteSummaryCustomerSegment, QuoteSummaryStatus, QuoteSummaryType } from '@/features/quotes/data/quote-summary'
import type { QuoteDetail } from '@/features/quotes/data/quote-detail'
import type { QuoteDetailApiDTO } from '@/features/quotes/contracts/quote-detail-api-dto'
import type { QuoteListItemApiDTO } from '@/features/quotes/contracts/quote-api-dto'

function normalizeCustomerSegment(value: string | undefined): QuoteSummaryCustomerSegment {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'vip') return 'vip'
  if (normalized === 'long-term' || normalized === 'long_term' || normalized === 'longterm') return 'long-term'
  return 'new'
}

function normalizeQuoteType(value: string | undefined): QuoteSummaryType {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'wholesale') return 'wholesale'
  if (normalized === 'sample') return 'sample'
  return 'retail'
}

function normalizeStatus(value: string | undefined): QuoteSummaryStatus {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'pending') return 'pending'
  if (normalized === 'converted') return 'converted'
  if (normalized === 'voided' || normalized === 'cancelled' || normalized === 'canceled') return 'voided'
  return 'draft'
}

function formatAmountLabel(value: number | string | undefined, amountLabel?: string): string {
  if (typeof amountLabel === 'string' && amountLabel.trim()) return amountLabel
  if (typeof value === 'number' && Number.isFinite(value)) return `¥ ${value.toFixed(2)}`
  if (typeof value === 'string' && value.trim()) return value
  return '¥ 0.00'
}

export function toQuoteSummaryContract(dto: QuoteListItemApiDTO, index: number): QuoteSummary {
  const quoteNo = dto.quoteNo?.trim() || dto.code?.trim() || `QUOTE-${index + 1}`

  return {
    id: dto.id?.trim() || quoteNo,
    quoteNo,
    customerName: dto.customerName?.trim() || dto.customer?.trim() || '未命名客户',
    customerSegment: normalizeCustomerSegment(dto.customerSegment || dto.segment),
    quoteType: normalizeQuoteType(dto.quoteType || dto.type),
    status: normalizeStatus(dto.status),
    updatedAt: dto.updatedAt?.trim() || dto.updated_at?.trim() || '未知时间',
    amountLabel: formatAmountLabel(dto.amount ?? dto.totalAmount, dto.amountLabel),
    itemCount: dto.itemCount ?? dto.lineCount ?? 0,
    ownerName: dto.ownerName?.trim() || dto.owner?.trim() || '未分配',
    productSummary: dto.productSummary?.trim() || dto.summary?.trim() || '待补充产品摘要',
  }
}

export function toQuoteSummaryContracts(items: QuoteListItemApiDTO[]): QuoteSummary[] {
  return items.map(toQuoteSummaryContract)
}

export function toQuoteDetailContract(dto: QuoteDetailApiDTO): QuoteDetail {
  return {
    id: dto.id?.trim() || '',
    quoteNo: dto.quoteNo?.trim() || '',
    orderName: dto.orderName?.trim() || '',
    customerName: dto.customerName?.trim() || '',
    customerId: dto.customerId?.trim() || '',
    wechat: dto.wechat?.trim() || '',
    whatsapp: dto.whatsapp?.trim() || '',
    customerSegment: dto.customerSegment?.trim() || 'new',
    type: dto.type?.trim() || 'retail',
    status: dto.status?.trim() || 'draft',
    currency: dto.currency?.trim() || 'CNY',
    amountLabel: dto.amountLabel?.trim() || '¥ 0.00',
    quantityLabel: dto.quantityLabel?.trim() || '0.00',
    orderDate: dto.orderDate?.trim() || '',
    deliveryDate: dto.deliveryDate?.trim() || '',
    paymentMethodName: dto.paymentMethodName?.trim() || '',
    paymentTermName: dto.paymentTermName?.trim() || '',
    requirements: dto.requirements?.trim() || '',
    ownerName: dto.ownerName?.trim() || '',
    updatedAt: dto.updatedAt?.trim() || '',
    lines: (dto.lines ?? []).map((line, index) => ({
      id: String(line.id ?? `line-${index + 1}`),
      lineNo: line.lineNo ?? index + 1,
      productModel: line.productModel?.trim() || '',
      productCode: line.productCode?.trim() || '',
      specification: line.specification?.trim() || '',
      qty: line.qty ?? 0,
      price: line.price ?? 0,
      amount: line.amount ?? 0,
      uom: line.uom?.trim() || '',
      note: line.note?.trim() || '',
    })),
  }
}
