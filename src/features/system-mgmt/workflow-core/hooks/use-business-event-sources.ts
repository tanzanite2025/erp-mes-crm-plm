import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import {
  BUSINESS_EVENT_SOURCE_TEMPLATES,
  type BusinessEventSource,
  type BusinessEventSourceCreatePayload,
  type BusinessEventSourceUpdatePayload,
  materializeBusinessEventSourceTemplate,
} from '../data/business-event-source-schema'
import { RoutingService } from '../services/routing-service'

const logger = createLogger('useBusinessEventSources')

/**
 * 后端拉不到事件源时使用的 fallback 列表。
 * 来源是 BUSINESS_EVENT_SOURCE_TEMPLATES 中 meta.seedAsFallback === true 的模板。
 */
export function buildFallbackBusinessEventSources() {
  return BUSINESS_EVENT_SOURCE_TEMPLATES.filter(
    (template) => template.meta.seedAsFallback === true
  ).map((template) => materializeBusinessEventSourceTemplate(template))
}

export function useBusinessEventSources() {
  const [sources, setSources] = useState<BusinessEventSource[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const loadSources = useCallback(async () => {
    try {
      setError(null)
      const data = await RoutingService.getEventSources()
      setSources(data)
    } catch (err) {
      setError(err)
      logger.error('加载业务事件源失败', err)
      setSources(buildFallbackBusinessEventSources())
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    void loadSources()
  }, [loadSources])

  const addSource = useCallback(
    async (source: BusinessEventSourceCreatePayload) => {
      try {
        const saved = await RoutingService.saveEventSource(source)
        setSources((prev) => [...prev, saved])
        toast.success('业务事件源已创建')
        return saved
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const isDuplicate =
          message.includes('duplicate key') ||
          message.includes('unique constraint') ||
          message.includes('已存在')
        if (isDuplicate) {
          logger.warn('创建业务事件源失败：编码已存在', err)
          toast.error(
            `事件源编码 ${source.code} 已存在，可能由其他用户或会话创建。已为你刷新列表。`
          )
          void loadSources()
        } else {
          logger.error('创建业务事件源失败', err)
          toast.error(`创建业务事件源失败：${message}`)
        }
        return undefined
      }
    },
    [loadSources]
  )

  const updateSource = useCallback(
    async (id: string, updates: Partial<BusinessEventSource>) => {
      const target = sources.find((source) => source.id === id)
      if (!target) return undefined

      try {
        const merged = {
          ...target,
          ...updates,
        }
        const { createdAt: _createdAt, updatedAt: _updatedAt, ...writePayload } =
          merged
        const saved = await RoutingService.updateEventSource(
          id,
          writePayload as BusinessEventSourceUpdatePayload
        )
        setSources((prev) =>
          prev.map((source) => (source.id === id ? saved : source))
        )
        return saved
      } catch (err) {
        logger.error('更新业务事件源失败', err)
        toast.error(`更新业务事件源失败：${err}`)
        return undefined
      }
    },
    [sources]
  )

  const deleteSource = useCallback(async (id: string) => {
    try {
      await RoutingService.deleteEventSource(id)
      setSources((prev) => prev.filter((source) => source.id !== id))
      toast.info('业务事件源已删除')
    } catch (err) {
      logger.error('删除业务事件源失败', err)
      toast.error(`删除业务事件源失败：${err}`)
    }
  }, [])

  /**
   * 用服务端返回的事件源快照（如状态重命名事务返回的结果）原地替换本地缓存。
   * 仅供"服务端已经处理完一次写入操作，需要把权威结果同步到 hook 状态"的场景使用。
   * 不会做任何额外的 API 调用或版本校验。
   */
  const applyServerSnapshot = useCallback((nextSource: BusinessEventSource) => {
    setSources((prev) =>
      prev.map((source) => (source.id === nextSource.id ? nextSource : source))
    )
  }, [])

  return {
    sources,
    isLoaded,
    error,
    addSource,
    updateSource,
    deleteSource,
    applyServerSnapshot,
    reloadSources: loadSources,
  }
}
