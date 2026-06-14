type SalesOrderLineDisplaySource = {
  lineNo: number
  productModel?: string
  specification?: string
  description?: string
  productDisplayTitleSnapshot?: string
  productDisplaySubtitleSnapshot?: string
  productDisplayFullLabelSnapshot?: string
}

export function resolveSalesOrderLineDisplayTitle(
  line: SalesOrderLineDisplaySource
): string {
  return (
    line.productDisplayTitleSnapshot?.trim() ||
    line.productDisplayFullLabelSnapshot?.trim() ||
    '未识别产品'
  )
}

export function resolveSalesOrderLineDisplaySubtitle(
  line: SalesOrderLineDisplaySource
): string {
  return line.productDisplaySubtitleSnapshot?.trim() || '--'
}

export function formatSalesOrderPreassembleCandidateLabel(
  line: SalesOrderLineDisplaySource
): string {
  return `候选行 #${line.lineNo} ${resolveSalesOrderLineDisplayTitle(line)}`
}
