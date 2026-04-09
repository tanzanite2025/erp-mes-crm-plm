/**
 * [ARCHITECTURAL-WARNING]
 * 此服务目前存在严重的“前端权威”逻辑。
 * 1. 模拟了交付数量的物理累加。
 * 2. 模拟了订单状态机的流转逻辑。
 * 
 * 在生产环境下，此逻辑必须迁移至后端 Authority Engine 或通过 TDO (Transaction Data Object) 提交意图，
 * 由服务器基于数据库快照进行原子化更新，严禁在前端进行 Read-Modify-Write 操作。
 */

import { apiFetch } from '@/lib/api-client'
import { type SalesOrder } from '../data/schema'
import { toSalesOrderApiDTO, toSalesOrderContract } from '../sales/adapters/sales-order-api-adapter'
import { type SalesOrderApiDTO } from '../sales/contracts/sales-order-api-dto'

const getSalesOrderByNo = async (orderNo: string): Promise<SalesOrder> => {
  const res = await apiFetch<SalesOrderApiDTO>(`/sales-orders/by-no/${orderNo}`)
  return toSalesOrderContract(res)
}

const saveSalesOrderDeliveryProgress = async (order: SalesOrder): Promise<SalesOrder> => {
  const res = await apiFetch<SalesOrderApiDTO>('/sales-orders', {
    method: 'POST',
    body: JSON.stringify(toSalesOrderApiDTO(order)),
  })
  return toSalesOrderContract(res)
}

/**
 * [UI-SIMULATION-ONLY]
 * 警告：此函数执行的是“逻辑模拟”，不具备最终权威性。
 */
export const updateOrderDelivery = async (
  orderNo: string,
  materialId: string,
  quantity: number,
): Promise<void> => {
  const order = await getSalesOrderByNo(orderNo).catch(() => null)
  if (!order || order.isDeleted) return

  let changed = false
  // [UI-DERIVED-CALCULATION]: 这里的本地累加仅供 UI 即时反馈
  order.lines = (order.lines || []).map((line) => {
    if (line.productId === materialId || line.productCode === materialId) {
      const delivered = Math.max(0, Number(line.deliveredQty || 0) + quantity)
      changed = true
      return {
        ...line,
        deliveredQty: delivered,
        // [UI-SIMULATED-STATE]: 状态变更应由后端审计系统根据 Delta 自动推导
        status: delivered >= line.qty ? 'Done' : delivered > 0 ? 'InProgress' : 'Pending',
      }
    }
    return line
  })

  if (!changed) return

  // [UI-SIMULATED-AGGREGATION]: 聚合逻辑存在并发更新漂移风险
  const allDone = order.lines.every((line) => Number(line.deliveredQty || 0) >= line.qty)
  const anyStarted = order.lines.some((line) => Number(line.deliveredQty || 0) > 0)

  if (allDone) {
    order.status = 'Done'
  } else if (anyStarted) {
    order.status = 'InProgress'
  } else {
    order.status = 'Pending'
  }

  await saveSalesOrderDeliveryProgress(order)
}
