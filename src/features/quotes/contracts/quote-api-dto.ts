export type QuoteListItemApiDTO = {
  id?: string
  quoteNo?: string
  code?: string
  customerName?: string
  customer?: string
  customerSegment?: string
  segment?: string
  quoteType?: string
  type?: string
  status?: string
  updatedAt?: string
  updated_at?: string
  amount?: number | string
  totalAmount?: number | string
  amountLabel?: string
  itemCount?: number
  lineCount?: number
  ownerName?: string
  owner?: string
  productSummary?: string
  summary?: string
}

export type QuoteListPageApiDTO = {
  items?: QuoteListItemApiDTO[]
  data?: QuoteListItemApiDTO[]
  total?: number
}
