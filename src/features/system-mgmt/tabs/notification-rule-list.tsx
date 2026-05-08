import { useEffect, useMemo, useState } from 'react'
import { Info, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isForbiddenError } from '@/lib/error-status'
import { Button } from '@/components/ui/button'
import { ForbiddenState } from '@/components/forbidden-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DEFAULT_SALES_ORDER_EVENT_SOURCE } from '../workflow-core/data/business-event-source-templates/sales-order'
import { getBusinessEventDefaultResolveStatuses } from '../workflow-core/data/business-event-status-catalog'
import { type BusinessEventSourceTemplate } from '../workflow-core/data/business-event-source-types'
import { type NotificationRule } from '../workflow-core/data/notification-rule-schema'
import { getBusinessEventSourceRuntimeCoverage } from '../workflow-core/data/business-event-source-runtime-coverage'
import { RoutingQueryErrorState } from '../workflow-core/components/routing-query-error-state'
import { useBusinessEventSources } from '../workflow-core/hooks/use-business-event-sources'
import { useNotificationRules } from '../workflow-core/hooks/use-notification-rules'
import { NotificationRuleListEmpty } from './components/notification-rule-list-empty'
import { NotificationRuleListToolbar } from './components/notification-rule-list-toolbar'
import { RuleCard } from './components/rule-card'

function createSegmentId() {
  return crypto.randomUUID?.() ?? `seg-${Date.now()}`
}

function getDefaultStatusActionCode(source: BusinessEventSourceTemplate) {
  return (
    source.config.actions.find((action) => action.kind === 'status')?.code ??
    source.config.actions.find((action) => action.code === 'STATUS_CHANGED')
      ?.code ??
    source.config.actions[0]?.code ??
    'STATUS_CHANGED'
  )
}

type NotificationRuleListSearchState = {
  keyword: string
  sourceCodeFilter: string
  createSourceCode: string
}

export function NotificationRuleList({
  searchState,
  onSearchStateChange,
}: {
  searchState?: NotificationRuleListSearchState
  onSearchStateChange?: (partial: Partial<NotificationRuleListSearchState>) => void
} = {}) {
  const {
    rules,
    isLoaded,
    error,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    reloadRules,
  } = useNotificationRules()
  const {
    sources,
    error: sourceError,
    reloadSources,
  } = useBusinessEventSources()
  const [latestCreatedRuleId, setLatestCreatedRuleId] = useState<string | null>(
    null
  )
  const [localKeyword, setLocalKeyword] = useState('')
  const [localSourceCodeFilter, setLocalSourceCodeFilter] = useState('all')
  const [localCreateSourceCode, setLocalCreateSourceCode] = useState('')

  const keyword = searchState?.keyword ?? localKeyword
  const sourceCodeFilter = searchState?.sourceCodeFilter ?? localSourceCodeFilter
  const createSourceCode = searchState?.createSourceCode ?? localCreateSourceCode

  const setKeyword = (value: string) => {
    if (onSearchStateChange) {
      onSearchStateChange({ keyword: value })
      return
    }
    setLocalKeyword(value)
  }

  const setSourceCodeFilter = (value: string) => {
    if (onSearchStateChange) {
      onSearchStateChange({ sourceCodeFilter: value })
      return
    }
    setLocalSourceCodeFilter(value)
  }

  const setCreateSourceCode = (value: string) => {
    if (onSearchStateChange) {
      onSearchStateChange({ createSourceCode: value })
      return
    }
    setLocalCreateSourceCode(value)
  }

  const enabledRuleCount = rules.filter((rule) => rule.enabled).length

  const enabledSources = useMemo(
    () => sources.filter((source) => source.enabled),
    [sources]
  )
  const selectedCreateSourceCode =
    createSourceCode ||
    enabledSources[0]?.code ||
    DEFAULT_SALES_ORDER_EVENT_SOURCE.code

  const createSource =
    enabledSources.find((source) => source.code === selectedCreateSourceCode) ??
    enabledSources[0] ??
    DEFAULT_SALES_ORDER_EVENT_SOURCE

  const createSourceCoverage = getBusinessEventSourceRuntimeCoverage(
    createSource.code
  )

  const filteredRules = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return rules.filter((rule) => {
      const matchesKeyword = !normalizedKeyword
        ? true
        : rule.name.toLowerCase().includes(normalizedKeyword)

      const matchesSource =
        sourceCodeFilter === 'all' ? true : rule.sourceCode === sourceCodeFilter

      return matchesKeyword && matchesSource
    })
  }, [keyword, rules, sourceCodeFilter])

  const handleAddNewRule = async () => {
    const source = createSource
    const actionCode = getDefaultStatusActionCode(source)
    const defaultResolveStatuses = getBusinessEventDefaultResolveStatuses(source)
    const newRule: Omit<NotificationRule, 'id' | 'createdAt'> = {
      name: `${source.name}通知规则`,
      enabled: true,
      entity: source.entity,
      sourceCode: source.code,
      actionCode,
      version: 1,
      segments: [
        {
          id: createSegmentId(),
          title: '新阶段',
          targetStatuses: source.config.statuses[0]?.code
            ? [source.config.statuses[0].code]
            : [],
          commandIds: [],
          assigneeGroups: [],
          assigneeUsernames: [],
          resolveOnStatuses: defaultResolveStatuses,
          dynamicTargetField: null,
          approval: {
            enabled: false,
            module: 'Trading',
            action: 'ORDER_REVIEW',
            approver1Id: '',
            approver2Id: '',
            dynamicApproverField: null,
            reasonTemplate:
              '业务规则 [RuleName] / [SegmentTitle] 已命中，请审批单据 [OrderNo]。',
          },
        },
      ],
    }
    const createdRule = await addRule(newRule)
    if (createdRule?.id) {
      setLatestCreatedRuleId(createdRule.id)
    }
  }

  useEffect(() => {
    if (!latestCreatedRuleId) return

    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`notification-rule-${latestCreatedRuleId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    const timer = window.setTimeout(() => {
      setLatestCreatedRuleId(null)
    }, 3200)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [latestCreatedRuleId])

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (!isLoaded) {
    return (
      <div className='flex h-64 flex-col items-center justify-center gap-4 text-muted-foreground'>
        <Loader2 className='size-8 animate-spin text-primary/40' />
        <span className='text-[10px] font-black tracking-widest uppercase opacity-60'>
          正在同步通知规则...
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <RoutingQueryErrorState
        error={error}
        resourceLabel='通知规则'
        endpoint='/system/routing/rules'
        protocolShape='通知规则列表协议'
        onRetry={() => void reloadRules()}
      />
    )
  }

  if (sourceError) {
    return (
      <RoutingQueryErrorState
        error={sourceError}
        resourceLabel='业务事件源'
        endpoint='/system/routing/event-sources'
        protocolShape='业务事件源列表协议'
        onRetry={() => void reloadSources()}
      />
    )
  }

  return (
    <div className='mx-auto max-w-6xl space-y-5 pb-12 transition-all duration-500'>
      <div className='rounded-[24px] border border-dashed border-muted/40 bg-muted/5 p-4'>
        <div className='grid gap-4 xl:grid-cols-[150px_minmax(0,1fr)_auto] xl:items-center'>
          <div className='rounded-2xl bg-muted/30 px-4 py-3'>
            <div className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              已启用
            </div>
            <div className='mt-1 flex items-end gap-1'>
              <span className='text-2xl font-black tracking-tight text-foreground'>
                {enabledRuleCount}
              </span>
              <span className='pb-1 text-xs font-bold text-muted-foreground'>
                / {rules.length} 条
              </span>
            </div>
            <div className='mt-1 text-xs font-bold text-muted-foreground'>
              监听规则
            </div>
          </div>

          <div className='grid gap-3 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] lg:items-center'>
            <div className='space-y-1.5'>
              <label className='px-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                业务源
              </label>
              <Select
                value={selectedCreateSourceCode}
                onValueChange={setCreateSourceCode}
              >
                <SelectTrigger className='h-12 rounded-2xl bg-background px-5 text-sm font-black'>
                  <SelectValue placeholder='选择业务源' />
                </SelectTrigger>
                <SelectContent>
                  {enabledSources.map((source) => {
                    const coverage = getBusinessEventSourceRuntimeCoverage(
                      source.code
                    )
                    return (
                      <SelectItem key={source.id} value={source.code}>
                        {source.name}
                        {coverage.status === 'preconnected' ? ' / 预接入' : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div
              className={cn(
                'flex min-h-12 items-start gap-2 rounded-2xl border px-4 py-3 text-xs font-bold leading-relaxed',
                createSourceCoverage.status === 'preconnected'
                  ? 'border-sky-200 bg-sky-50 text-sky-700'
                  : 'border-muted/40 bg-muted/20 text-muted-foreground'
              )}
            >
              <Info className='mt-0.5 size-4 shrink-0' />
              <span>
                {createSourceCoverage.status === 'preconnected'
                  ? `当前选择的是${createSource.name}，属于预接入业务源。可以先准备规则骨架，但 APS 业务定义确认前，不建议当作正式生产规则启用。`
                  : `选择${createSource.name}后直接建立规则，再配置进入某个状态时通知谁、是否需要审批。`}
              </span>
            </div>
          </div>

          <Button
            size='lg'
            className='h-12 w-full gap-2 rounded-2xl px-6 text-xs font-black xl:w-auto'
            onClick={handleAddNewRule}
          >
            <Plus className='size-4' /> 建立监控规则
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <NotificationRuleListEmpty />
      ) : (
        <div className='space-y-4'>
          <NotificationRuleListToolbar
            keyword={keyword}
            onKeywordChange={setKeyword}
            sourceCodeFilter={sourceCodeFilter}
            onSourceCodeFilterChange={setSourceCodeFilter}
            sources={sources}
          />

          <div className='stagger-list grid grid-cols-1 gap-4'>
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                id={`notification-rule-${rule.id}`}
                className={cn(
                  'scroll-mt-24 rounded-[28px] transition-all duration-500',
                  latestCreatedRuleId === rule.id &&
                    'ring-2 ring-primary/30 ring-offset-4 ring-offset-background'
                )}
              >
                <RuleCard
                  rule={rule}
                  onUpdate={updateRule}
                  onDelete={deleteRule}
                  onToggle={toggleRule}
                  eventSources={sources}
                  autoExpand={latestCreatedRuleId === rule.id}
                />
              </div>
            ))}
            {filteredRules.length === 0 ? (
              <NotificationRuleListEmpty filtered />
            ) : null}
          </div>
        </div>
      )}

      {rules.length > 0 && (
        <div className='px-2 pt-2'>
          <p className='max-w-2xl text-[10px] leading-relaxed text-muted-foreground/60'>
            <b>提示：</b>{' '}
            每个规则可以包含多个业务分支阶段。建议按业务实体分类规则，再在同一规则内管理不同生命周期阶段的通知与审批配置。
          </p>
        </div>
      )}
    </div>
  )
}
