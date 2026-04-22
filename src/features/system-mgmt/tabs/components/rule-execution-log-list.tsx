import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
} from './rule-execution-log-presenter'

interface RuleExecutionLogListProps {
  items: RuleExecutionLog[]
  locale: string
  page: number
  totalPages: number
  total: number
  isFetching: boolean
  onPreviousPage: () => void
  onNextPage: () => void
}

export function RuleExecutionLogList({
  items,
  locale,
  page,
  totalPages,
  total,
  isFetching,
  onPreviousPage,
  onNextPage,
}: RuleExecutionLogListProps) {
  return (
    <>
      {items.map((log) => {
        const TypeIcon = getExecutionTypeIcon(log.executionType)
        const StatusIcon = getStatusIcon(log.executionStatus)

        return (
          <div
            key={log.id}
            className='rounded-[24px] border border-dashed border-slate-200 bg-background/80 p-4'
          >
            <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
              <div className='space-y-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge className={getExecutionTypeBadgeClass(log.executionType)}>
                    <TypeIcon className='mr-1 size-3.5' />
                    {getExecutionTypeLabel(log.executionType)}
                  </Badge>
                  <Badge className={getExecutionStatusBadgeClass(log.executionStatus)}>
                    <StatusIcon className='mr-1 size-3.5' />
                    {getExecutionStatusLabel(log.executionStatus)}
                  </Badge>
                  {log.sourceCode ? (
                    <Badge variant='outline'>{log.sourceCode}</Badge>
                  ) : null}
                  {log.statusCode ? (
                    <Badge variant='outline'>{log.statusCode}</Badge>
                  ) : null}
                </div>
                <div>
                  <p className='text-sm font-black tracking-tight text-slate-900'>
                    {log.title || log.segmentTitle || log.ruleName || '未命名执行记录'}
                  </p>
                  <p className='text-xs text-muted-foreground'>
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
              <div className='text-right text-xs text-muted-foreground'>
                <p>
                  {new Date(log.triggeredAt).toLocaleString(locale, {
                    hour12: false,
                  })}
                </p>
                <p className='font-mono'>{log.eventKey || '-'}</p>
              </div>
            </div>

            <div className='mt-4 grid gap-3 lg:grid-cols-2'>
              <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3'>
                <p className='text-[10px] font-black uppercase tracking-widest text-slate-500'>
                  接收对象
                </p>
                <p className='mt-1 text-sm text-slate-700'>
                  {formatTargets(log)}
                </p>
              </div>
              <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3'>
                <p className='text-[10px] font-black uppercase tracking-widest text-slate-500'>
                  跳转链接
                </p>
                <p className='mt-1 break-all font-mono text-xs text-slate-700'>
                  {log.actionUrl || '未配置'}
                </p>
              </div>
            </div>

            {log.content ? (
              <div className='mt-3 rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-700'>
                {log.content}
              </div>
            ) : null}

            {log.errorMessage ? (
              <div className='mt-3 rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
                {getReadableExecutionError(log.errorMessage)}
              </div>
            ) : null}
          </div>
        )
      })}

      <div className='flex items-center justify-between pt-2'>
        <p className='text-xs text-muted-foreground'>
          当前第 {page} / {totalPages} 页，共 {total} 条
        </p>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={page <= 1 || isFetching}
            onClick={onPreviousPage}
          >
            上一页
          </Button>
          <Button
            variant='outline'
            size='sm'
            disabled={page >= totalPages || isFetching}
            onClick={onNextPage}
          >
            下一页
          </Button>
        </div>
      </div>
    </>
  )
}
