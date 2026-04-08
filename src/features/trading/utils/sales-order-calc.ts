

/**
 * [PREVIEW-ONLY] 前端预览计算单行的总额 (仅用于 UI 实时反馈)
 * 警告：此计算结果严禁作为业务提交的最终数据。最终金额由 Go 后端 Authority 重算引擎裁定。
 */
export const previewLineAmount = (qty: number, price: number): number => {
  return roundToTwo(qty * price)
}

/**
 * [PREVIEW-ONLY] 前端预览重新汇总指标
 * 警告：此计算结果仅用于 UI 渲染。最终数据以 API 返回的后端重算结果为准。
 * 支持 SalesOrderLine 和 PurchaseOrderLine (Duck Typing)
 */
export const previewOrderTotals = <T extends { lineNo: number; qty: number; price: number; amount: number }>(
  lines: T[]
) => {
  const reindexed = lines.map((line, index) => ({
    ...line,
    lineNo: index + 1,
  }))

  const totalQty = reindexed.reduce((sum, line) => sum + (Number(line.qty) || 0), 0)
  const totalAmount = reindexed.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)

  return {
    lines: reindexed,
    quantity: totalQty,
    amount: roundToTwo(totalAmount),
  }
}

/**
 * 精度对齐工具：保留两位小数 (四舍五入)
 * 匹配后端 math.Round(x*100)/100 逻辑
 */
export const roundToTwo = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100
}

/**
 * 简单的 UUID/ID 生成器逻辑外置
 */
export const generateSalesOrderId = (): string => {
  return `SO${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`
}
