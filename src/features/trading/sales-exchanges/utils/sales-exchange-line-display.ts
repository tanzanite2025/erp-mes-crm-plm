type SalesExchangeLineDisplaySource = {
  lineNo: number
  productCode?: string
  productModel?: string
  specification?: string
  description?: string
  productDisplayTitleSnapshot?: string
  productDisplaySubtitleSnapshot?: string
  productDisplayFullLabelSnapshot?: string
}

export function resolveSalesExchangeLineDisplayTitle(
  line: SalesExchangeLineDisplaySource
): string {
  return (
    line.productDisplayTitleSnapshot?.trim() ||
    line.productDisplayFullLabelSnapshot?.trim() ||
    `订单行 ${line.lineNo}`
  )
}

export function resolveSalesExchangeLineDisplaySubtitle(
  line: SalesExchangeLineDisplaySource
): string {
  return line.productDisplaySubtitleSnapshot?.trim() || '--'
}
