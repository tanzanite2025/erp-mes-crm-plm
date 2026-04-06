import { type SalesOrderLine } from '../data/schema'

/**
 * 计算单行的总额 (Fixed 2 digits)
 */
export const calculateLineAmount = (qty: number, price: number): number => {
  return Number((qty * price).toFixed(2))
}

/**
 * 重新编排行号并计算总汇总指标
 */
export const recalculateOrderTotals = (lines: SalesOrderLine[]) => {
  const reindexed = lines.map((line, index) => ({
    ...line,
    lineNo: index + 1,
  }))

  const totalQty = reindexed.reduce((sum, line) => sum + (Number(line.qty) || 0), 0)
  const totalAmount = reindexed.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)

  return {
    lines: reindexed,
    quantity: totalQty,
    amount: totalAmount,
  }
}

/**
 * 简单的 UUID/ID 生成器逻辑外置
 */
export const generateSalesOrderId = (): string => {
  return `SO${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`
}
