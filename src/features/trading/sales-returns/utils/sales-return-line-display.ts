type SalesReturnLineDisplaySource = {
  lineNo: number
  productCode?: string
  productModel?: string
  specification?: string
  description?: string
  productDisplayTitleSnapshot?: string
  productDisplaySubtitleSnapshot?: string
  productDisplayFullLabelSnapshot?: string
}

export function resolveSalesReturnLineDisplayTitle(
  line: SalesReturnLineDisplaySource
): string {
  return (
    line.productDisplayTitleSnapshot?.trim() ||
    line.productDisplayFullLabelSnapshot?.trim() ||
    `退货行 ${line.lineNo}`
  )
}

export function resolveSalesReturnLineDisplaySubtitle(
  line: SalesReturnLineDisplaySource
): string {
  return line.productDisplaySubtitleSnapshot?.trim() || '--'
}
