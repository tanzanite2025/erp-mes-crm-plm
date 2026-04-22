const settlementMoneyFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})

export function formatSettlementMoney(value: number, currencyCode?: string) {
  const formattedValue = settlementMoneyFormatter.format(value)
  return currencyCode ? `${currencyCode} ${formattedValue}` : formattedValue
}
