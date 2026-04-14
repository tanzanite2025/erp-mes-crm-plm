export type QuoteCustomerFilter = 'all' | 'vip' | 'long-term' | 'new'
export type QuoteStatusFilter = 'all' | 'draft' | 'pending' | 'converted' | 'voided'
export type QuoteTypeFilter = 'all' | 'retail' | 'wholesale' | 'sample'

export type QuoteSummaryStatus = Exclude<QuoteStatusFilter, 'all'>
export type QuoteSummaryType = Exclude<QuoteTypeFilter, 'all'>
export type QuoteSummaryCustomerSegment = Exclude<QuoteCustomerFilter, 'all'>

export type QuoteSummary = {
  id: string
  quoteNo: string
  customerName: string
  customerSegment: QuoteSummaryCustomerSegment
  quoteType: QuoteSummaryType
  status: QuoteSummaryStatus
  updatedAt: string
  amountLabel: string
  itemCount: number
  ownerName: string
  productSummary: string
}

export type QuoteListFilters = {
  customer: QuoteCustomerFilter
  status: QuoteStatusFilter
  quoteType: QuoteTypeFilter
  keyword: string
}
