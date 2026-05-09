import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import {
  type RuleExecutionStatus,
  type RuleExecutionType,
} from '../workflow-core/data/rule-execution-log-schema'
import { RoutingQueryErrorState } from '../workflow-core/components/routing-query-error-state'
import { RoutingService } from '../workflow-core/services/routing-service'
import { RuleExecutionLogList } from './components/rule-execution-log-list'
import { shouldHideExecutionLogByDefault } from './components/rule-execution-log-presenter'
import { RuleExecutionLogSummary } from './components/rule-execution-log-summary'
import { RuleExecutionLogToolbar } from './components/rule-execution-log-toolbar'

const PAGE_SIZE = 20
const INITIAL_VISIBLE_COUNT = 5
const LOAD_MORE_STEP = 5

type RuleExecutionLogTabSearchState = {
  page: number
  keyword: string
  sourceCode: string
  executionType: 'all' | RuleExecutionType
  executionStatus: 'all' | RuleExecutionStatus
}

export function RuleExecutionLogTab({
  searchState,
  onSearchStateChange,
}: {
  searchState?: RuleExecutionLogTabSearchState
  onSearchStateChange?: (partial: Partial<RuleExecutionLogTabSearchState>) => void
} = {}) {
  const { locale } = useLanguage()
  const [localPage, setLocalPage] = useState(1)
  const [localKeyword, setLocalKeyword] = useState('')
  const [localSourceCode, setLocalSourceCode] = useState('all')
  const [localExecutionType, setLocalExecutionType] =
    useState<'all' | RuleExecutionType>('all')
  const [localExecutionStatus, setLocalExecutionStatus] =
    useState<'all' | RuleExecutionStatus>('all')
  const [listVisibilityState, setListVisibilityState] = useState<{
    key: string
    visibleCount: number
  }>({
    key: '',
    visibleCount: INITIAL_VISIBLE_COUNT,
  })

  const page = searchState?.page ?? localPage
  const keyword = searchState?.keyword ?? localKeyword
  const sourceCode = searchState?.sourceCode ?? localSourceCode
  const executionType = searchState?.executionType ?? localExecutionType
  const executionStatus = searchState?.executionStatus ?? localExecutionStatus

  const setPage = (value: number | ((current: number) => number)) => {
    const nextValue = typeof value === 'function' ? value(page) : value
    if (onSearchStateChange) {
      onSearchStateChange({ page: nextValue })
      return
    }
    setLocalPage(nextValue)
  }

  const setKeyword = (value: string) => {
    if (onSearchStateChange) {
      onSearchStateChange({ keyword: value })
      return
    }
    setLocalKeyword(value)
  }

  const setSourceCode = (value: string) => {
    if (onSearchStateChange) {
      onSearchStateChange({ sourceCode: value })
      return
    }
    setLocalSourceCode(value)
  }

  const setExecutionType = (value: 'all' | RuleExecutionType) => {
    if (onSearchStateChange) {
      onSearchStateChange({ executionType: value })
      return
    }
    setLocalExecutionType(value)
  }

  const setExecutionStatus = (value: 'all' | RuleExecutionStatus) => {
    if (onSearchStateChange) {
      onSearchStateChange({ executionStatus: value })
      return
    }
    setLocalExecutionStatus(value)
  }

  const query = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      sourceCode: sourceCode === 'all' ? undefined : sourceCode,
      executionType: executionType === 'all' ? undefined : executionType,
      executionStatus:
        executionStatus === 'all' ? undefined : executionStatus,
    }),
    [executionStatus, executionType, page, sourceCode]
  )

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['routing-execution-logs', query],
    queryFn: () => RoutingService.getExecutionLogs(query),
  })

  const rawItems = useMemo(() => {
    const raw = data?.items ?? []
    const normalizedKeyword = keyword.trim().toLowerCase()
    if (!normalizedKeyword) return raw

    return raw.filter((item) => {
      const haystack = [
        item.ruleName,
        item.segmentTitle,
        item.title,
        item.content,
        item.sourceCode,
        item.actionCode,
        item.statusCode,
        item.errorMessage,
        item.commandId,
        item.eventKey,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedKeyword)
    })
  }, [data?.items, keyword])

  const shouldAutoHideConfigurationPendingLogs =
    executionStatus === 'all' && keyword.trim() === ''
  const hiddenConfigurationPendingCount = useMemo(
    () =>
      shouldAutoHideConfigurationPendingLogs
        ? rawItems.filter((item) => shouldHideExecutionLogByDefault(item)).length
        : 0,
    [rawItems, shouldAutoHideConfigurationPendingLogs]
  )
  const items = useMemo(
    () =>
      shouldAutoHideConfigurationPendingLogs
        ? rawItems.filter((item) => !shouldHideExecutionLogByDefault(item))
        : rawItems,
    [rawItems, shouldAutoHideConfigurationPendingLogs]
  )
  const listVisibilityKey = `${page}::${keyword}::${sourceCode}::${executionType}::${executionStatus}`
  const effectiveVisibleCount =
    listVisibilityState.key === listVisibilityKey
      ? listVisibilityState.visibleCount
      : INITIAL_VISIBLE_COUNT
  const visibleItems = useMemo(
    () => items.slice(0, effectiveVisibleCount),
    [effectiveVisibleCount, items]
  )
  const hasMoreItems = visibleItems.length < items.length

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          acc[item.executionStatus] += 1
          return acc
        },
        { matched: 0, success: 0, failed: 0, skipped: 0 }
      ),
    [items]
  )

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))
  const sourceOptions = useMemo(() => {
    const values = new Set(
      (data?.items ?? []).map((item) => item.sourceCode).filter(Boolean)
    )
    return Array.from(values)
  }, [data?.items])

  return (
    <div className='space-y-0'>
      <RuleExecutionLogSummary
        pageItemCount={items.length}
        successCount={totals.success}
        failedCount={totals.failed}
        skippedCount={totals.skipped}
      />

      <Card className='rounded-[24px] border-dashed border-muted/40 bg-muted/5 shadow-none'>
        <RuleExecutionLogToolbar
          keyword={keyword}
          onKeywordChange={setKeyword}
          sourceCode={sourceCode}
          onSourceCodeChange={(value) => {
            if (onSearchStateChange) {
              onSearchStateChange({ page: 1, sourceCode: value })
              return
            }
            setPage(1)
            setSourceCode(value)
          }}
          sourceOptions={sourceOptions}
          executionType={executionType}
          onExecutionTypeChange={(value) => {
            if (onSearchStateChange) {
              onSearchStateChange({ page: 1, executionType: value })
              return
            }
            setPage(1)
            setExecutionType(value)
          }}
          executionStatus={executionStatus}
          onExecutionStatusChange={(value) => {
            if (onSearchStateChange) {
              onSearchStateChange({ page: 1, executionStatus: value })
              return
            }
            setPage(1)
            setExecutionStatus(value)
          }}
          isFetching={isFetching}
          onRefresh={() => void refetch()}
        />
        <CardContent className='space-y-0 px-0 pb-0 pt-0'>
          {hiddenConfigurationPendingCount > 0 ? (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-0.5 text-[11px] font-bold text-slate-600'>
              已默认收起 {hiddenConfigurationPendingCount} 条“待配置 / 预期跳过”日志，避免在规则尚未配完时制造失败错觉；如需查看，可把“执行结果”切换为“跳过”。
            </div>
          ) : null}

          {isError ? (
            <RoutingQueryErrorState
              error={error}
              resourceLabel='执行日志'
              endpoint='/system/routing/execution-logs'
              protocolShape='`{ items, total, page, pageSize }`'
              retryLabel='重新加载执行日志'
              onRetry={() => void refetch()}
            />
          ) : isLoading ? (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600'>
              正在同步规则执行日志...
            </div>
          ) : items.length === 0 && hiddenConfigurationPendingCount > 0 ? (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600'>
              当前页日志都属于“待配置 / 预期跳过”记录，已默认收起；如需查看，可把“执行结果”切换为“跳过”。
            </div>
          ) : items.length === 0 ? (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600'>
              当前筛选条件下还没有执行日志。
            </div>
          ) : (
            <RuleExecutionLogList
              items={visibleItems}
              locale={locale}
              page={page}
              totalPages={totalPages}
              total={data?.total ?? items.length}
              visibleCount={Math.min(effectiveVisibleCount, items.length)}
              hasMore={hasMoreItems}
              isFetching={isFetching}
              onPreviousPage={() =>
                setPage((current) => Math.max(1, current - 1))
              }
              onNextPage={() => setPage((current) => current + 1)}
              onLoadMore={() =>
                setListVisibilityState({
                  key: listVisibilityKey,
                  visibleCount: effectiveVisibleCount + LOAD_MORE_STEP,
                })
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
