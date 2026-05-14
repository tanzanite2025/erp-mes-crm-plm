import { useCallback, useEffect, useRef, useState } from 'react'
import { createLogger } from '@/lib/logger'
import { type NotificationRule } from '../data/notification-rule-schema'
import {
  startNotificationRulesScanScheduler,
  triggerNotificationRulesScanNow,
} from '../services/notification-rules-scan-scheduler'
import { RoutingService } from '../services/routing-service'

const logger = createLogger('NotificationRules')

type NotificationRuleCreateInput = Omit<NotificationRule, 'id' | 'createdAt'>

export function useNotificationRules() {
  const [rules, setRules] = useState<NotificationRule[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const rulesRef = useRef<NotificationRule[]>([])

  // 让 scheduler 通过 ref 拿到最新规则，避免 effect 依赖 rules 导致 timer 频繁重启
  useEffect(() => {
    rulesRef.current = rules
  }, [rules])

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

  const addRule = useCallback(
    async (ruleData: Omit<NotificationRule, 'id' | 'createdAt' | 'version'>) => {
      try {
        const ruleWithVersion: NotificationRuleCreateInput = {
          ...ruleData,
          version: 1,
        }
        const newRule = await RoutingService.saveRule(ruleWithVersion)
        setRules((prev) => {
          const next = [newRule, ...prev]
          void triggerNotificationRulesScanNow(next)
          return next
        })
        return newRule
      } catch (err) {
        logger.error('新增通知规则失败', err)
      }
    },
    []
  )

  const updateRule = useCallback(
    async (id: string, updates: Partial<NotificationRule>) => {
      const target = rulesRef.current.find((rule) => rule.id === id)
      if (!target) return

      try {
        const updated = await RoutingService.updateRule(id, {
          ...target,
          ...updates,
          version: (target.version ?? 1) + 1,
        })

        setRules((prev) => {
          const next = prev.map((rule) => (rule.id === id ? updated : rule))
          void triggerNotificationRulesScanNow(next)
          return next
        })
      } catch (err) {
        logger.error('更新通知规则失败', err)
      }
    },
    []
  )

  const deleteRule = useCallback(async (id: string) => {
    try {
      await RoutingService.deleteRule(id)
      setRules((prev) => prev.filter((rule) => rule.id !== id))
    } catch (err) {
      logger.error('删除通知规则失败', err)
    }
  }, [])

  const toggleRule = useCallback(async (id: string) => {
    const target = rulesRef.current.find((rule) => rule.id === id)
    if (!target) return

    try {
      const updated = await RoutingService.updateRule(id, {
        ...target,
        enabled: !target.enabled,
        version: (target.version ?? 1) + 1,
      })
      setRules((prev) => {
        const next = prev.map((rule) => (rule.id === id ? updated : rule))
        if (updated.enabled) {
          void triggerNotificationRulesScanNow(next)
        }
        return next
      })
    } catch (err) {
      logger.error('切换通知规则状态失败', err)
    }
  }, [])

  // 周期扫描走单例 scheduler，多组件并发挂载也只跑一份
  useEffect(() => {
    if (!isLoaded) return
    const stop = startNotificationRulesScanScheduler(() => rulesRef.current)
    return stop
  }, [isLoaded])

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
