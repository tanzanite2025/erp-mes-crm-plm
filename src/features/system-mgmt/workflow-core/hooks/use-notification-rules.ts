import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import { type PurchaseOrder, type SalesOrder } from '@/features/trading/data/schema'
import { getPurchaseOrders } from '@/features/trading/purchase'
import { getSalesOrders } from '@/features/trading/sales'
import { type NotificationRule } from '../data/notification-rule-schema'
import { DispatchService } from '../services/dispatch-service'
import { getProductionRuleSnapshots } from '../services/production-task-query-service'
import { RoutingService } from '../services/routing-service'

const logger = createLogger('NotificationRules')

type NotificationRuleCreateInput = Omit<NotificationRule, 'id' | 'createdAt'>

type DispatchOrderSnapshot = {
  id: string
  orderNo: string
  status: string
  createdBy?: string
  lines?: Array<{
    productModel?: string
    claimedBy?: string
  }>
}

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

export function useNotificationRules() {
  const [rules, setRules] = useState<NotificationRule[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const loadRules = useCallback(async () => {
    try {
      setError(null)
      const data = await RoutingService.getRules()
      setRules(data)
    } catch (err) {
      setError(err)
      logger.error('加载通知规则失败', err)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    void loadRules()
  }, [loadRules])

  const triggerScan = useCallback(async (latestRules: NotificationRule[]) => {
    try {
      const [salesOrders, purchaseOrders, production] = await Promise.all([
        getSalesOrders({ withLines: true }),
        getPurchaseOrders({ withLines: true }),
        getProductionRuleSnapshots(),
      ])

      const salesOrderSnapshots: DispatchOrderSnapshot[] = salesOrders.items.map(
        (order: SalesOrder) => ({
          id: order.id,
          orderNo: order.orderNo,
          status: order.status,
          createdBy: order.createdBy,
          lines: order.lines?.map((line) => ({
            productModel: line.productModel,
            claimedBy: line.claimedBy,
          })),
        })
      )

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

      const scannedCount = await DispatchService.scanByRules(latestRules, {
        salesOrders: salesOrderSnapshots,
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
  }, [])

  const addRule = useCallback(
    async (ruleData: Omit<NotificationRule, 'id' | 'createdAt' | 'version'>) => {
      try {
        const ruleWithVersion: NotificationRuleCreateInput = {
          ...ruleData,
          version: 1,
        }
        const newRule = await RoutingService.saveRule(ruleWithVersion)
        setRules((prev) => [newRule, ...prev])
        await triggerScan([...rules, newRule])
        return newRule
      } catch (err) {
        logger.error('新增通知规则失败', err)
      }
    },
    [rules, triggerScan]
  )

  const updateRule = useCallback(
    async (id: string, updates: Partial<NotificationRule>) => {
      const target = rules.find((rule) => rule.id === id)
      if (!target) return

      try {
        const updated = await RoutingService.updateRule(id, {
          ...target,
          ...updates,
          version: (target.version ?? 1) + 1,
        })

        const next = rules.map((rule) => (rule.id === id ? updated : rule))
        setRules(next)
        await triggerScan(next)
      } catch (err) {
        logger.error('更新通知规则失败', err)
      }
    },
    [rules, triggerScan]
  )

  const deleteRule = useCallback(async (id: string) => {
    try {
      await RoutingService.deleteRule(id)
      setRules((prev) => prev.filter((rule) => rule.id !== id))
    } catch (err) {
      logger.error('删除通知规则失败', err)
    }
  }, [])

  const toggleRule = useCallback(
    async (id: string) => {
      const target = rules.find((rule) => rule.id === id)
      if (!target) return

      try {
        const updated = await RoutingService.updateRule(id, {
          ...target,
          enabled: !target.enabled,
          version: (target.version ?? 1) + 1,
        })
        const next = rules.map((rule) => (rule.id === id ? updated : rule))
        setRules(next)
        if (updated.enabled) {
          await triggerScan(next)
        }
      } catch (err) {
        logger.error('切换通知规则状态失败', err)
      }
    },
    [rules, triggerScan]
  )

  useEffect(() => {
    if (!isLoaded || rules.length === 0) return
    const initialTimer = setTimeout(() => void triggerScan(rules), 2000)
    const intervalTimer = setInterval(() => void triggerScan(rules), 60_000)
    return () => {
      clearTimeout(initialTimer)
      clearInterval(intervalTimer)
    }
  }, [isLoaded, rules, triggerScan])

  return {
    rules,
    isLoaded,
    error,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    reloadRules: loadRules,
  }
}
