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

const FALLBACK_SOURCE_CODES = new Set([
  'SALES_ORDER',
  'PURCHASE_ORDER',
  'PRODUCTION_PLAN',
  'PRODUCTION_TASK',
])

export function buildFallbackBusinessEventSources() {
  return BUSINESS_EVENT_SOURCE_TEMPLATES.filter((template) =>
    FALLBACK_SOURCE_CODES.has(template.code)
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
        logger.error('创建业务事件源失败', err)
        toast.error(`创建业务事件源失败：${err}`)
        return undefined
      }
    },
    []
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

  const replaceSource = useCallback((nextSource: BusinessEventSource) => {
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
    replaceSource,
    reloadSources: loadSources,
  }
}
