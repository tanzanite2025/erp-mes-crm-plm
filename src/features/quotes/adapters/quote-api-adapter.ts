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
    ownerName: requireNonEmptyString(dto.ownerName ?? dto.owner, context, 'ownerName'),
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

  return {
    id: requireNonEmptyString(dto.id, context, 'id'),
    quoteNo: requireNonEmptyString(dto.quoteNo, context, 'quoteNo'),
    orderName: requireNonEmptyString(dto.orderName, context, 'orderName'),
    customerName: requireNonEmptyString(dto.customerName, context, 'customerName'),
    customerId: requireNonEmptyString(dto.customerId, context, 'customerId'),
    wechat: requireNonEmptyString(dto.wechat, context, 'wechat'),
    whatsapp: requireNonEmptyString(dto.whatsapp, context, 'whatsapp'),
    customerSegment: normalizeCustomerSegment(dto.customerSegment, context),
    type: normalizeQuoteType(dto.type, context),
    status: normalizeStatus(dto.status, context),
    currency: requireNonEmptyString(dto.currency, context, 'currency'),
    amountLabel: requireNonEmptyString(dto.amountLabel, context, 'amountLabel'),
    quantityLabel: requireNonEmptyString(dto.quantityLabel, context, 'quantityLabel'),
    orderDate: requireNonEmptyString(dto.orderDate, context, 'orderDate'),
    deliveryDate: requireNonEmptyString(dto.deliveryDate, context, 'deliveryDate'),
    paymentMethodName: requireNonEmptyString(dto.paymentMethodName, context, 'paymentMethodName'),
    paymentTermName: requireNonEmptyString(dto.paymentTermName, context, 'paymentTermName'),
    requirements: requireNonEmptyString(dto.requirements, context, 'requirements'),
    ownerName: requireNonEmptyString(dto.ownerName, context, 'ownerName'),
    updatedAt: requireNonEmptyString(dto.updatedAt, context, 'updatedAt'),
    lines: lines.map((line, index) => {
      const lineContext = `${context}.lines[${index}]`
      return {
        id: requireNonEmptyString(String(line.id ?? ''), lineContext, 'id'),
        lineNo: requireNumber(line.lineNo, lineContext, 'lineNo'),
        productModel: requireNonEmptyString(line.productModel, lineContext, 'productModel'),
        productCode: requireNonEmptyString(line.productCode, lineContext, 'productCode'),
        specification: requireNonEmptyString(line.specification, lineContext, 'specification'),
        qty: requireNumber(line.qty, lineContext, 'qty'),
        price: requireNumber(line.price, lineContext, 'price'),
        amount: requireNumber(line.amount, lineContext, 'amount'),
        uom: requireNonEmptyString(line.uom, lineContext, 'uom'),
        note: requireNonEmptyString(line.note, lineContext, 'note'),
      }
    }),
  }
}
