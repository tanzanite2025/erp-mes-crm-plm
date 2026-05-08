import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useHierarchyLevelLabels } from '@/features/production-shared/tabs/hierarchy-config/hooks/use-hierarchy-level-labels'
import { createLogger } from '@/lib/logger'
import { isForbiddenError } from '@/lib/error-status'
import { ForbiddenState } from '@/components/forbidden-state'
import {
  BUSINESS_EVENT_SOURCE_TEMPLATES,
  type BusinessEventSource,
} from '../workflow-core/data/business-event-source-schema'
import { type NotificationRule } from '../workflow-core/data/notification-rule-schema'
import {
  countConnectedBusinessEventSources,
  countPreconnectedBusinessEventSources,
} from '../workflow-core/data/business-event-source-runtime-coverage'
import { RoutingQueryErrorState } from '../workflow-core/components/routing-query-error-state'
import { useBusinessEventSources } from '../workflow-core/hooks/use-business-event-sources'
import { RoutingService } from '../workflow-core/services/routing-service'
import {
  createDuplicateEventSource,
  createEventSourceFromTemplate,
  createNewEventSource,
} from './business-event-source-list-helpers'
import { BusinessEventSourceCard } from './components/business-event-source-card'
import { BusinessEventSourceListHeader } from './components/business-event-source-list-header'
import { BusinessEventSourceListHint } from './components/business-event-source-list-hint'

const LEGACY_LEVEL3_FIELD_LABELS = new Set(['工序', '末级层级', 'Process', 'Level 3'])
const logger = createLogger('BusinessEventSourceList')

function applyDynamicProcessFieldLabel<T extends { code: string; config: { fields: Array<{ key: string; label: string }> } }>(
  source: T,
  level3Name: string
): T {
  if (source.code !== 'PRODUCTION_TASK') {
    return source
  }

  const hasLegacyProcessField = source.config.fields.some(
    (field) => field.key === 'processName' && LEGACY_LEVEL3_FIELD_LABELS.has(field.label.trim())
  )

  if (!hasLegacyProcessField) {
    return source
  }

  return {
    ...source,
    config: {
      ...source.config,
      fields: source.config.fields.map((field) =>
        field.key === 'processName' && LEGACY_LEVEL3_FIELD_LABELS.has(field.label.trim())
          ? { ...field, label: level3Name }
          : field
      ),
    },
  }
}

type BusinessEventSourceListSearchState = {
  templateCode: string
  searchValue: string
  expandedSourceIds: string[]
}

export function BusinessEventSourceList({
  searchState,
  onSearchStateChange,
}: {
  searchState?: BusinessEventSourceListSearchState
  onSearchStateChange?: (
    partial: Partial<BusinessEventSourceListSearchState>
  ) => void
} = {}) {
  const { level3Name } = useHierarchyLevelLabels()
  const {
    sources,
    isLoaded,
    error,
    addSource,
    updateSource,
    deleteSource,
    reloadSources,
  } = useBusinessEventSources()
  const [localTemplateCode, setLocalTemplateCode] = useState(
    BUSINESS_EVENT_SOURCE_TEMPLATES[0]?.code ?? ''
  )
  const [localExpandedSourceIds, setLocalExpandedSourceIds] = useState<string[]>([])
  const [localSearchValue, setLocalSearchValue] = useState('')
  const [highlightedSourceId, setHighlightedSourceId] = useState<string | null>(
    null
  )
  const [rules, setRules] = useState<NotificationRule[]>([])
  const [rulesLoaded, setRulesLoaded] = useState(false)
  const sourceCardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const templateCode = searchState?.templateCode ?? localTemplateCode
  const expandedSourceIds =
    searchState?.expandedSourceIds ?? localExpandedSourceIds
  const searchValue = searchState?.searchValue ?? localSearchValue

  const setTemplateCode = (value: string) => {
    if (onSearchStateChange) {
      onSearchStateChange({ templateCode: value })
      return
    }
    setLocalTemplateCode(value)
  }

  const setExpandedSourceIds = (updater: string[] | ((prev: string[]) => string[])) => {
    const nextValue =
      typeof updater === 'function' ? updater(expandedSourceIds) : updater

    if (onSearchStateChange) {
      onSearchStateChange({ expandedSourceIds: nextValue })
      return
    }

    setLocalExpandedSourceIds(nextValue)
  }

  const setSearchValue = (value: string) => {
    if (onSearchStateChange) {
      onSearchStateChange({ searchValue: value })
      return
    }
    setLocalSearchValue(value)
  }

  const displaySources = useMemo(
    () => sources.map((source) => applyDynamicProcessFieldLabel(source, level3Name)),
    [level3Name, sources]
  )

  const selectedTemplate =
    BUSINESS_EVENT_SOURCE_TEMPLATES.find(
      (template) => template.code === templateCode
    ) ?? BUSINESS_EVENT_SOURCE_TEMPLATES[0]

  const templateOptions = useMemo(
    () =>
      BUSINESS_EVENT_SOURCE_TEMPLATES.map((template) => ({
        code: template.code,
        name: template.name,
      })),
    []
  )

  const connectedCount = useMemo(
    () =>
      countConnectedBusinessEventSources(
        sources.map((source) => source.code)
      ),
    [sources]
  )
  const preconnectedCount = useMemo(
    () =>
      countPreconnectedBusinessEventSources(
        sources.map((source) => source.code)
      ),
    [sources]
  )

  const normalizedSearchValue = searchValue.trim().toLowerCase()
  const filteredSources = !normalizedSearchValue
    ? displaySources
    : displaySources.filter((source) => {
        const name = source.name.toLowerCase()
        const code = source.code.toLowerCase()
        return name.includes(normalizedSearchValue) || code.includes(normalizedSearchValue)
      })

  const allVisibleExpanded =
    filteredSources.length > 0 &&
    filteredSources.every((source) => expandedSourceIds.includes(source.id))

  const importSelectedTemplate = async () => {
    if (!selectedTemplate) return
    const saved = await addSource(
      createEventSourceFromTemplate(
        applyDynamicProcessFieldLabel(selectedTemplate, level3Name),
        sources
      )
    )
    if (saved) {
      setExpandedSourceIds((prev) =>
        prev.includes(saved.id) ? prev : [...prev, saved.id]
      )
      setHighlightedSourceId(saved.id)
    }
  }

  const createBlankSource = async () => {
    const saved = await addSource(createNewEventSource())
    if (saved) {
      setExpandedSourceIds((prev) =>
        prev.includes(saved.id) ? prev : [...prev, saved.id]
      )
      setHighlightedSourceId(saved.id)
    }
  }

  const duplicateSource = async (source: BusinessEventSource) => {
    const saved = await addSource(createDuplicateEventSource(source, sources))
    if (saved) {
      setExpandedSourceIds((prev) =>
        prev.includes(saved.id) ? prev : [...prev, saved.id]
      )
      setHighlightedSourceId(saved.id)
    }
  }

  useEffect(() => {
    if (!highlightedSourceId) return
    sourceCardRefs.current[highlightedSourceId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
    const timer = window.setTimeout(() => setHighlightedSourceId(null), 2200)
    return () => window.clearTimeout(timer)
  }, [highlightedSourceId])

  useEffect(() => {
    let cancelled = false

    void RoutingService.getRules()
      .then((data) => {
        if (cancelled) return
        setRules(data)
        setRulesLoaded(true)
      })
      .catch((error) => {
        if (cancelled) return
        logger.error('Failed to load notification rules for status references', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (!isLoaded) {
    return (
      <div className='flex h-64 flex-col items-center justify-center gap-4 text-muted-foreground'>
        <Loader2 className='size-8 animate-spin text-primary/40' />
        <span className='text-[10px] font-black tracking-widest uppercase opacity-60'>
          正在同步业务事件源...
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <RoutingQueryErrorState
        error={error}
        resourceLabel='业务事件源'
        endpoint='/system/routing/event-sources'
        protocolShape='业务事件源列表协议'
        onRetry={() => void reloadSources()}
      />
    )
  }

  return (
    <div className='mx-auto flex max-w-6xl flex-col gap-5 pb-12'>
      <BusinessEventSourceListHeader
        sources={sources}
        visibleCount={filteredSources.length}
        connectedCount={connectedCount}
        preconnectedCount={preconnectedCount}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        allExpanded={allVisibleExpanded}
        onExpandAll={() =>
          setExpandedSourceIds((prev) => {
            const next = new Set(prev)
            filteredSources.forEach((source) => next.add(source.id))
            return Array.from(next)
          })
        }
        onCollapseAll={() =>
          setExpandedSourceIds((prev) =>
            prev.filter(
              (id) => !filteredSources.some((source) => source.id === id)
            )
          )
        }
        templateOptions={templateOptions}
        templateCode={templateCode}
        onTemplateChange={setTemplateCode}
        onImportTemplate={importSelectedTemplate}
        onCreateBlank={createBlankSource}
      />

      {filteredSources.length === 0 ? (
        <div className='rounded-3xl border border-dashed border-muted/50 bg-muted/10 px-6 py-10 text-center'>
          <p className='text-sm font-black tracking-tight'>未找到匹配的业务事件源</p>
          <p className='mt-2 text-xs font-bold text-muted-foreground'>
            试试搜索业务名称、事件源编码，或者先导入一个模板。
          </p>
        </div>
      ) : (
        filteredSources.map((source) => (
          <div
            key={source.id}
            ref={(node) => {
              sourceCardRefs.current[source.id] = node
            }}
          >
            <BusinessEventSourceCard
              source={source}
              expanded={expandedSourceIds.includes(source.id)}
              highlighted={highlightedSourceId === source.id}
              rules={rules}
              statusReferencesLoaded={rulesLoaded}
              onExpandedChange={(expanded) =>
                setExpandedSourceIds((prev) =>
                  expanded
                    ? prev.includes(source.id)
                      ? prev
                      : [...prev, source.id]
                    : prev.filter((id) => id !== source.id)
                )
              }
              onUpdate={updateSource}
              onDelete={deleteSource}
              onDuplicate={duplicateSource}
              canDelete={sources.length > 1}
            />
          </div>
        ))
      )}

      {sources.length > 0 && <BusinessEventSourceListHint />}
    </div>
  )
}
