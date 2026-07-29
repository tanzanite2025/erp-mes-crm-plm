import { RefreshCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CompactPaginationControls } from '@/components/pagination/compact-pagination-controls'
import { type RuleExecutionLog } from '../../workflow-core/data/rule-execution-log-schema'
import {
  formatTargets,
  getExecutionStatusBadgeClass,
  getExecutionStatusLabel,
  getExecutionTypeBadgeClass,
  getExecutionTypeIcon,
  getExecutionTypeLabel,
  getReadableExecutionError,
  getStatusIcon,
  isConfigurationPendingLog,
} from './rule-execution-log-presenter'

interface RuleExecutionLogListProps {
  items: RuleExecutionLog[]
  locale: string
  page: number
  totalPages: number
  total: number
  visibleCount: number
  hasMore: boolean
  isFetching: boolean
  canRetryNotificationLogs: boolean
  retryingLogId?: string
  onPreviousPage: () => void
  onNextPage: () => void
  onLoadMore: () => void
  onRetryNotification?: (id: string) => void
}

export function RuleExecutionLogList({
  items,
  locale,
  page,
  totalPages,
  total,
  visibleCount,
  hasMore,
  isFetching,
  canRetryNotificationLogs,
  retryingLogId,
  onPreviousPage,
  onNextPage,
  onLoadMore,
  onRetryNotification,
}: RuleExecutionLogListProps) {
  return (
    <>
      {items.map((log) => {
        const TypeIcon = getExecutionTypeIcon(log.executionType)
        const StatusIcon = getStatusIcon(log.executionStatus)
        const isConfigurationPending = isConfigurationPendingLog(log)
        const hasTargets = log.targets.length > 0
        const hasActionUrl = Boolean(log.actionUrl)
        const readableError = getReadableExecutionError(log.errorMessage)
        const canRetryNotification =
          log.executionType === 'notify' && log.executionStatus === 'failed'
        const isRetrying = retryingLogId === log.id

        return (
          <div
            key={log.id}
            className={
              isConfigurationPending
                ? 'rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-1.5'
                : 'rounded-[24px] border border-dashed border-slate-200 bg-background/80 p-1.5'
            }
          >
            <div className='flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between'>
              <div className='space-y-0.5'>
                <div className='flex flex-wrap items-center gap-1.5'>
                  <Badge
                    className={getExecutionTypeBadgeClass(log.executionType)}
                  >
                    <TypeIcon className='mr-1 size-3.5' />
                    {getExecutionTypeLabel(log.executionType)}
                  </Badge>
                  <Badge
                    className={getExecutionStatusBadgeClass(
                      log.executionStatus,
                      log
                    )}
                  >
                    <StatusIcon className='mr-1 size-3.5' />
                    {getExecutionStatusLabel(log.executionStatus, log)}
                  </Badge>
                  {log.sourceCode ? (
                    <Badge variant='outline'>{log.sourceCode}</Badge>
                  ) : null}
                  {log.statusCode ? (
                    <Badge variant='outline'>{log.statusCode}</Badge>
                  ) : null}
                </div>
                <div>
                  <p className='text-sm font-black tracking-tighter text-slate-900 italic'>
                    {log.title ||
                      log.segmentTitle ||
                      log.ruleName ||
                      '未命名执行记录'}
                  </p>
                  <p className='mt-0.5 text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    {[
                      log.ruleName ? `规则：${log.ruleName}` : null,
                      log.segmentTitle ? `分支：${log.segmentTitle}` : null,
                      log.commandId ? `指令：${log.commandId}` : null,
                      log.actionCode ? `动作：${log.actionCode}` : null,
                    ]
                      .filter(Boolean)
                      .join(' / ')}
                  </p>
                </div>
              </div>
              <div className='flex flex-col items-start gap-1 text-xs text-muted-foreground lg:items-end lg:text-right'>
                <p>
                  {new Date(log.triggeredAt).toLocaleString(locale, {
                    hour12: false,
                  })}
                </p>
                {log.executionStatus === 'failed' && log.eventKey ? (
                  <p className='font-mono text-[8px] leading-tight'>
                    {log.eventKey}
                  </p>
                ) : null}
                {canRetryNotification && onRetryNotification ? (
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8 rounded-full border-dashed border-rose-200 px-3 text-[10px] font-black tracking-widest text-rose-700 uppercase hover:bg-rose-50 hover:text-rose-800'
                    disabled={
                      isFetching || isRetrying || !canRetryNotificationLogs
                    }
                    title={
                      canRetryNotificationLogs
                        ? '重新投递失败通知'
                        : '需要管理权限才能重试通知'
                    }
                    onClick={() => onRetryNotification(log.id)}
                  >
                    <RefreshCcw
                      className={`size-3.5 ${isRetrying ? 'animate-spin' : ''}`}
                    />
                    {isRetrying ? '重试中' : '重试通知'}
                  </Button>
                ) : null}
              </div>
            </div>

            {hasTargets || hasActionUrl ? (
              <div className='mt-1.5 grid gap-1.5 lg:grid-cols-2'>
                {hasTargets ? (
                  <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5'>
                    <p className='text-[10px] font-black tracking-widest text-slate-500 uppercase'>
                      接收对象
                    </p>
                    <p className='mt-0.5 text-sm text-slate-700'>
                      {formatTargets(log)}
                    </p>
                  </div>
                ) : null}
                {hasActionUrl ? (
                  <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5'>
                    <p className='text-[10px] font-black tracking-widest text-slate-500 uppercase'>
                      跳转链接
                    </p>
                    <p className='mt-0.5 font-mono text-xs break-all text-slate-700'>
                      {log.actionUrl}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {log.content ? (
              <div className='mt-1.5 rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-3 py-1.5 text-sm text-slate-700'>
                {log.content}
              </div>
            ) : null}

            {log.errorMessage ? (
              <div
                className={
                  isConfigurationPending
                    ? 'mt-1.5 rounded-2xl border border-dashed border-slate-200 bg-slate-100 px-3 py-1.5 text-sm text-slate-700'
                    : 'mt-1.5 rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-700'
                }
              >
                {readableError}
              </div>
            ) : null}
          </div>
        )
      })}

      <div className='flex flex-col gap-0.5 pt-0 lg:flex-row lg:items-center lg:justify-between'>
        <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
          当前已显示 {items.length} / {visibleCount} 条
        </p>
        {hasMore ? (
          <button
            type='button'
            className='inline-flex h-9 items-center justify-center rounded-full border border-dashed border-muted-foreground/20 bg-muted/30 px-3.5 text-[10px] font-black tracking-widest text-foreground uppercase transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50'
            disabled={isFetching}
            onClick={onLoadMore}
          >
            查看更多
          </button>
        ) : null}
      </div>

      <CompactPaginationControls
        className='justify-between pt-0'
        page={page}
        totalPages={totalPages}
        total={total}
        disabled={isFetching}
        summaryClassName='min-w-[168px] text-left'
        onPageChange={(nextPage) => {
          if (nextPage > page) {
            onNextPage()
            return
          }
          if (nextPage < page) {
            onPreviousPage()
          }
        }}
      />
    </>
  )
}
