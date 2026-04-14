export type CustomerQuoteSummaryItemApiDTO = {
  quoteId?: string
  quoteNo?: string
  status?: string
  updatedAt?: string
  customerId?: string
}

export type CustomerQuoteSummaryResponseApiDTO = {
  items?: CustomerQuoteSummaryItemApiDTO[]
  total?: number
}
