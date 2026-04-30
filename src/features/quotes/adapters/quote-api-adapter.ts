import type { QuoteSummary, QuoteSummaryCustomerSegment, QuoteSummaryStatus, QuoteSummaryType } from '@/features/quotes/data/quote-summary'
import type { QuoteDetail } from '@/features/quotes/data/quote-detail'
import type { QuoteDetailApiDTO } from '@/features/quotes/contracts/quote-detail-api-dto'
import type { QuoteListItemApiDTO } from '@/features/quotes/contracts/quote-api-dto'

function requireNonEmptyString(value: unknown, context: string, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`[INVALID_RESPONSE] ${context} expected ${field} to be a non-empty string.`)
  }
  return value.trim()
}

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function optionalString(value: unknown): string {
  return trimString(value)
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function optionalDisplayName(value: unknown): string {
  const trimmed = trimString(value)
  return isUuidLike(trimmed) ? '' : trimmed
}

function firstNonEmptyString(values: unknown[], context: string, field: string): string {
  for (const value of values) {
    const trimmed = trimString(value)
    if (trimmed) return trimmed
  }
  throw new Error(`[INVALID_RESPONSE] ${context} expected ${field} to be a non-empty string.`)
}

function requireNumber(value: unknown, context: string, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`[INVALID_RESPONSE] ${context} expected ${field} to be a finite number.`)
  }
  return value
}

function normalizeCustomerSegment(value: unknown, context: string): QuoteSummaryCustomerSegment {
  if (typeof value !== 'string') {
    throw new Error(`[INVALID_RESPONSE] ${context} expected customerSegment to be a string.`)
  }
  const normalized = value.trim().toLowerCase()
  if (normalized === 'vip') return 'vip'
  if (normalized === 'long-term' || normalized === 'long_term' || normalized === 'longterm') return 'long-term'
  if (normalized === 'new') return 'new'
  throw new Error(`[INVALID_RESPONSE] ${context} expected customerSegment to be one of vip | long-term | new.`)
}

function normalizeQuoteType(value: unknown, context: string): QuoteSummaryType {
  if (typeof value !== 'string') {
    throw new Error(`[INVALID_RESPONSE] ${context} expected quoteType to be a string.`)
  }
  const normalized = value.trim().toLowerCase().replace(/[\s_-]/g, '')
  if (['wholesale', 'bulk', 'dealer', 'outsource', 'toll'].includes(normalized)) return 'wholesale'
  if (['sample', 'sam', 'smp', 'rd', 'rnd', 'r&d', 'trial'].includes(normalized)) return 'sample'
  if (['retail', 'ret', 'customer', 'estimate', 'general', 'normal', 'standard', 'quote'].includes(normalized)) return 'retail'
  throw new Error(`[INVALID_RESPONSE] ${context} expected quoteType to be one of retail | wholesale | sample.`)
}

function normalizeStatus(value: unknown, context: string): QuoteSummaryStatus {
  if (typeof value !== 'string') {
    throw new Error(`[INVALID_RESPONSE] ${context} expected status to be a string.`)
  }
  const normalized = value.trim().toLowerCase()
  if (normalized === 'pending') return 'pending'
  if (normalized === 'processing' || normalized === 'inprogress' || normalized === 'in_progress' || normalized === 'in-progress' || normalized === 'submitted') return 'pending'
  if (normalized === 'converted' || normalized === 'done' || normalized === 'completed' || normalized === 'complete' || normalized === 'closed') return 'converted'
  if (normalized === 'voided' || normalized === 'cancelled' || normalized === 'canceled') return 'voided'
  if (normalized === 'draft') return 'draft'
  throw new Error(`[INVALID_RESPONSE] ${context} expected status to be one of draft | pending | converted | voided.`)
}

function formatAmountLabel(value: unknown, amountLabel: unknown, context: string): string {
  if (typeof amountLabel === 'string' && amountLabel.trim()) return amountLabel.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return `¥ ${value.toFixed(2)}`
  if (typeof value === 'string' && value.trim()) return value.trim()
  throw new Error(`[INVALID_RESPONSE] ${context} expected amount or amountLabel to be present.`)
}

export function toQuoteSummaryContract(dto: QuoteListItemApiDTO, index: number): QuoteSummary {
  const context = `QuoteApiAdapter.toQuoteSummaryContract[${index}]`
  const quoteNo = requireNonEmptyString(dto.quoteNo ?? dto.code, context, 'quoteNo')

  return {
    id: requireNonEmptyString(dto.id ?? quoteNo, context, 'id'),
    quoteNo,
    customerName: requireNonEmptyString(dto.customerName ?? dto.customer, context, 'customerName'),
    customerSegment: normalizeCustomerSegment(dto.customerSegment ?? dto.segment, context),
    quoteType: normalizeQuoteType(dto.quoteType ?? dto.type, context),
    status: normalizeStatus(dto.status, context),
    updatedAt: requireNonEmptyString(dto.updatedAt ?? dto.updated_at, context, 'updatedAt'),
    amountLabel: formatAmountLabel(dto.amount ?? dto.totalAmount, dto.amountLabel, context),
    itemCount: dto.itemCount ?? dto.lineCount ?? (() => { throw new Error(`[INVALID_RESPONSE] ${context} expected itemCount or lineCount to be present.`) })(),
    ownerName: optionalDisplayName(dto.ownerName ?? dto.owner),
    productSummary: requireNonEmptyString(dto.productSummary ?? dto.summary, context, 'productSummary'),
  }
}

export function toQuoteSummaryContracts(items: QuoteListItemApiDTO[]): QuoteSummary[] {
  return items.map(toQuoteSummaryContract)
}

export function toQuoteDetailContract(dto: QuoteDetailApiDTO): QuoteDetail {
  const context = 'QuoteApiAdapter.toQuoteDetailContract'
  const lines = dto.lines
  if (!Array.isArray(lines)) {
    throw new Error(`[INVALID_RESPONSE] ${context} expected lines to be an array.`)
  }
  const quoteNo = requireNonEmptyString(dto.quoteNo, context, 'quoteNo')
  const customerName = firstNonEmptyString([dto.customerName, 'Unknown customer'], context, 'customerName')

  return {
    id: requireNonEmptyString(dto.id, context, 'id'),
    quoteNo,
    orderName: firstNonEmptyString([dto.orderName, quoteNo], context, 'orderName'),
    customerName,
    customerId: optionalString(dto.customerId),
    wechat: optionalString(dto.wechat),
    whatsapp: optionalString(dto.whatsapp),
    customerSegment: normalizeCustomerSegment(firstNonEmptyString([dto.customerSegment, 'new'], context, 'customerSegment'), context),
    type: normalizeQuoteType(firstNonEmptyString([dto.type, 'retail'], context, 'type'), context),
    status: normalizeStatus(firstNonEmptyString([dto.status, 'draft'], context, 'status'), context),
    currency: firstNonEmptyString([dto.currency, 'CNY'], context, 'currency'),
    amountLabel: firstNonEmptyString([dto.amountLabel, 'CNY 0.00'], context, 'amountLabel'),
    quantityLabel: firstNonEmptyString([dto.quantityLabel, '0.00'], context, 'quantityLabel'),
    orderDate: optionalString(dto.orderDate),
    deliveryDate: optionalString(dto.deliveryDate),
    paymentMethodName: optionalString(dto.paymentMethodName),
    paymentTermName: optionalString(dto.paymentTermName),
    requirements: optionalString(dto.requirements),
    ownerName: optionalDisplayName(dto.ownerName),
    updatedAt: optionalString(dto.updatedAt),
    lines: lines.map((line, index) => {
      const lineContext = `${context}.lines[${index}]`
      return {
        id: firstNonEmptyString([String(line.id ?? ''), `line-${index + 1}`], lineContext, 'id'),
        lineNo: requireNumber(line.lineNo, lineContext, 'lineNo'),
        productModel: firstNonEmptyString([line.productModel, line.productCode, 'Unnamed product'], lineContext, 'productModel'),
        productCode: optionalString(line.productCode),
        specification: optionalString(line.specification),
        qty: requireNumber(line.qty, lineContext, 'qty'),
        price: requireNumber(line.price, lineContext, 'price'),
        amount: requireNumber(line.amount, lineContext, 'amount'),
        uom: optionalString(line.uom),
        note: optionalString(line.note),
      }
    }),
  }
}
