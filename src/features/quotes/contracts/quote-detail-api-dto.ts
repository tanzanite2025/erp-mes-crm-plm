export type QuoteDetailLineApiDTO = {
  id?: number | string
  lineNo?: number
  productModel?: string
  productCode?: string
  specification?: string
  qty?: number
  price?: number
  amount?: number
  uom?: string
  note?: string
}

export type QuoteDetailApiDTO = {
  id?: string
  quoteNo?: string
  orderName?: string
  customerName?: string
  customerId?: string
  wechat?: string
  whatsapp?: string
  customerSegment?: string
  type?: string
  status?: string
  currency?: string
  amountLabel?: string
  quantityLabel?: string
  orderDate?: string
  deliveryDate?: string
  paymentMethodName?: string
  paymentTermName?: string
  requirements?: string
  ownerName?: string
  updatedAt?: string
  lines?: QuoteDetailLineApiDTO[]
}
