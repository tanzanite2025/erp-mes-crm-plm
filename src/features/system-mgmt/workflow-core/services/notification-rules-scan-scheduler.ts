import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import { getPurchaseOrders, type PurchaseOrder } from '@/features/purchase/orders'
import { type NotificationRule } from '../data/notification-rule-schema'
import { DispatchService } from './dispatch-service'
import { getProductionRuleSnapshots } from './production-task-query-service'

const logger = createLogger('NotificationRulesScanScheduler')

type DispatchPurchaseOrderSnapshot = {
  id: string
  orderNo: string
  status: string
  supplierName: string
  purchaser: string
  lines?: Array<{
    materialName?: string
  }>
}

const PERIODIC_INTERVAL_MS = 60_000
const INITIAL_DELAY_MS = 2_000

interface ScheduleHandle {
  refCount: number
  initialTimer: ReturnType<typeof setTimeout> | null
  intervalTimer: ReturnType<typeof setInterval> | null
  inFlight: boolean
  rulesGetter: () => NotificationRule[]
}

let activeHandle: ScheduleHandle | null = null

async function performScan(rules: NotificationRule[]) {
  if (rules.length === 0) return

  try {
    const [purchaseOrders, production] = await Promise.all([
      getPurchaseOrders({ withLines: true }),
      getProductionRuleSnapshots(),
    ])

    const purchaseOrderSnapshots: DispatchPurchaseOrderSnapshot[] =
      purchaseOrders.items.map((order: PurchaseOrder) => ({
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        supplierName: order.supplierName,
        purchaser: order.purchaser,
        lines: order.lines?.map((line) => ({
          materialName: line.materialName,
        })),
      }))

    const scannedCount = await DispatchService.scanByRules(rules, {
      purchaseOrders: purchaseOrderSnapshots,
      productionPlans: production.productionPlans,
      productionTasks: production.productionTasks,
    })

    if (scannedCount > 0) {
      toast.success(`扫描完成：已为 ${scannedCount} 项存量业务补偿通知`)
    }
  } catch (err) {
    logger.error('追溯扫描失败', err)
  }
}

async function safePerformScan(handle: ScheduleHandle) {
  if (handle.inFlight) return
  handle.inFlight = true
  try {
    await performScan(handle.rulesGetter())
  } finally {
    handle.inFlight = false
  }
}

/**
 * 全局单例：登记一个 rules getter 并启动周期扫描。
 * - 多个组件同时挂载只会启动一次定时器（refCount + rulesGetter 切换）
 * - 同一时刻只有一次扫描在飞行，避免并发
 * - 调用方手动触发的 triggerScanNow 也走同一个去重通道
 */
export function startNotificationRulesScanScheduler(
  rulesGetter: () => NotificationRule[]
): () => void {
  if (activeHandle) {
    activeHandle.refCount += 1
    activeHandle.rulesGetter = rulesGetter
    return () => unregister()
  }

  const handle: ScheduleHandle = {
    refCount: 1,
    initialTimer: null,
    intervalTimer: null,
    inFlight: false,
    rulesGetter,
  }
  activeHandle = handle

  handle.initialTimer = setTimeout(() => {
    void safePerformScan(handle)
  }, INITIAL_DELAY_MS)
  handle.intervalTimer = setInterval(() => {
    void safePerformScan(handle)
  }, PERIODIC_INTERVAL_MS)

  return () => unregister()
}

function unregister() {
  if (!activeHandle) return
  activeHandle.refCount -= 1
  if (activeHandle.refCount > 0) return

  if (activeHandle.initialTimer) clearTimeout(activeHandle.initialTimer)
  if (activeHandle.intervalTimer) clearInterval(activeHandle.intervalTimer)
  activeHandle = null
}

/**
 * 手动触发一次扫描（用于规则新增/编辑/启停后立即同步）。
 * 走同一去重通道，扫描在飞行中会跳过。
 */
export async function triggerNotificationRulesScanNow(
  rules: NotificationRule[]
) {
  if (activeHandle?.inFlight) return
  if (activeHandle) {
    activeHandle.inFlight = true
    try {
      await performScan(rules)
    } finally {
      activeHandle.inFlight = false
    }
    return
  }

  // 没有 active handle 时也允许直接扫一次（用于 hook 还没建立时的边界情况）
  await performScan(rules)
}
