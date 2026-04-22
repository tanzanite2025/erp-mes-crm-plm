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
import { RuleExecutionLogSummary } from './components/rule-execution-log-summary'
import { RuleExecutionLogToolbar } from './components/rule-execution-log-toolbar'

const PAGE_SIZE = 20

export function RuleExecutionLogTab() {
  const { locale } = useLanguage()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [sourceCode, setSourceCode] = useState('all')
  const [executionType, setExecutionType] =
    useState<'all' | RuleExecutionType>('all')
  const [executionStatus, setExecutionStatus] =
    useState<'all' | RuleExecutionStatus>('all')

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

  const items = useMemo(() => {
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
    <div className='space-y-5'>
      <RuleExecutionLogSummary
        pageItemCount={items.length}
        successCount={totals.success}
        failedCount={totals.failed}
        skippedCount={totals.skipped}
      />

      <Card className='rounded-[28px] border-dashed shadow-none'>
        <RuleExecutionLogToolbar
          keyword={keyword}
          onKeywordChange={setKeyword}
          sourceCode={sourceCode}
          onSourceCodeChange={(value) => {
            setPage(1)
            setSourceCode(value)
          }}
          sourceOptions={sourceOptions}
          executionType={executionType}
          onExecutionTypeChange={(value) => {
            setPage(1)
            setExecutionType(value)
          }}
          executionStatus={executionStatus}
          onExecutionStatusChange={(value) => {
            setPage(1)
            setExecutionStatus(value)
          }}
          isFetching={isFetching}
          onRefresh={() => void refetch()}
        />
        <CardContent className='space-y-4'>
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
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600'>
              正在同步规则执行日志...
            </div>
          ) : items.length === 0 ? (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600'>
              当前筛选条件下还没有执行日志。
            </div>
          ) : (
            <RuleExecutionLogList
              items={items}
              locale={locale}
              page={page}
              totalPages={totalPages}
              total={data?.total ?? items.length}
              isFetching={isFetching}
              onPreviousPage={() =>
                setPage((current) => Math.max(1, current - 1))
              }
              onNextPage={() => setPage((current) => current + 1)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
