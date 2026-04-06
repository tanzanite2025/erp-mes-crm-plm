import { useState, useEffect, useCallback } from 'react'
import { createLogger } from '@/lib/logger'
import { type NotificationRule } from '../data/notification-rule-schema'
import { DispatchService } from '../services/dispatch-service'
import { getSalesOrders } from '@/features/trading/services/trading-service'
import { RoutingService } from '../services/routing-service'

const logger = createLogger('NotificationRules')

/**
 * 通知规则管理 Hook (V2: 后端裁决架构)
 * 移除了所有繁琐的前端存储迁移逻辑 (V1/Rules/V2/Canvas)，回归后端单一事实源。
 */
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
            logger.error('加载失败', err)
        } finally {
            setIsLoaded(true)
        }
    }, [])

    useEffect(() => { loadRules() }, [loadRules])

    const triggerScan = useCallback(async (latestRules: NotificationRule[]) => {
        try {
            const orders = await getSalesOrders()
            // 扫描任务目前依然由前端驱动
            await DispatchService.scanByRules(latestRules, orders.items)
        } catch (err) {
            logger.error('追溯扫描失败', err)
        }
    }, [])

    // ─── CRUD 适配 (后端对接) ───────────────────────────────────────────────────

    const addRule = useCallback(async (ruleData: Omit<NotificationRule, 'id' | 'createdAt'>) => {
        try {
            const newRule = await RoutingService.saveRule(ruleData)
            setRules(prev => [...prev, newRule])
            await triggerScan([...rules, newRule])
        } catch (err) {
            logger.error('新增失败', err)
        }
    }, [rules, triggerScan])

    const updateRule = useCallback(async (id: string, updates: Partial<NotificationRule>) => {
        try {
            const updated = await RoutingService.updateRule(id, updates)
            const next = rules.map(r => r.id === id ? updated : r)
            setRules(next)
            await triggerScan(next)
        } catch (err) {
            logger.error('更新失败', err)
        }
    }, [rules, triggerScan])

    const deleteRule = useCallback(async (id: string) => {
        try {
            await RoutingService.deleteRule(id)
            setRules(prev => prev.filter(r => r.id !== id))
        } catch (err) {
            logger.error('删除失败', err)
        }
    }, [])

    const toggleRule = useCallback(async (id: string) => {
        const target = rules.find(r => r.id === id)
        if (!target) return
        
        try {
            const updated = await RoutingService.updateRule(id, { enabled: !target.enabled })
            const next = rules.map(r => r.id === id ? updated : r)
            setRules(next)
            if (updated.enabled) {
                await triggerScan(next)
            }
        } catch (err) {
            logger.error('状态切换失败', err)
        }
    }, [rules, triggerScan])

    // 定时扫描任务保持不变 (模拟系统后台)
    useEffect(() => {
        if (!isLoaded || rules.length === 0) return
        const initialTimer = setTimeout(() => triggerScan(rules), 2000)
        const intervalTimer = setInterval(() => triggerScan(rules), 60000)
        return () => { clearTimeout(initialTimer); clearInterval(intervalTimer) }
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
