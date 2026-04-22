import {
  ChevronDown,
  ChevronRight,
  Copy,
  DatabaseZap,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface BusinessEventSourceCardHeaderProps {
  name: string
  code: string
  runtimeCoverageLabel: string
  runtimeCoverageDescription: string
  runtimeCoverageClassName: string
  description?: string | null
  enabled: boolean
  expanded: boolean
  highlighted?: boolean
  statusSummary: string
  fieldSummary: string
  dirtySectionCount: number
  hasDirtyChanges: boolean
  savingAll: boolean
  hasValidationErrors: boolean
  canDelete: boolean
  onExpandedChange: (expanded: boolean) => void
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onEnabledChange: (enabled: boolean) => void
  onSaveAll: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export function BusinessEventSourceCardHeader({
  name,
  code,
  runtimeCoverageLabel,
  runtimeCoverageDescription,
  runtimeCoverageClassName,
  description,
  enabled,
  expanded,
  highlighted = false,
  statusSummary,
  fieldSummary,
  dirtySectionCount,
  hasDirtyChanges,
  savingAll,
  hasValidationErrors,
  canDelete,
  onExpandedChange,
  onNameChange,
  onDescriptionChange,
  onEnabledChange,
  onSaveAll,
  onDuplicate,
  onDelete,
}: BusinessEventSourceCardHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between',
        expanded && 'border-b border-muted/20',
        highlighted && 'bg-sky-50/40'
      )}
    >
      <div className='flex min-w-0 flex-1 gap-4'>
        <div className='flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner'>
          <DatabaseZap className='size-5' />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            {expanded ? (
              <Input
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                className='h-10 max-w-xs rounded-2xl text-sm font-bold tracking-normal'
              />
            ) : (
              <div className='truncate text-sm font-bold leading-5 tracking-normal text-foreground'>
                {name}
              </div>
            )}
            <Badge
              variant='outline'
              className='rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground'
            >
              {code}
            </Badge>
            <Badge
              variant='outline'
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                runtimeCoverageClassName
              )}
              title={runtimeCoverageDescription}
            >
              {runtimeCoverageLabel}
            </Badge>
            <Badge
              variant='secondary'
              className='rounded-full px-2 py-0.5 text-[10px] font-semibold text-muted-foreground'
            >
              {statusSummary}
            </Badge>
            <Badge
              variant='secondary'
              className='rounded-full px-2 py-0.5 text-[10px] font-semibold text-muted-foreground'
            >
              {fieldSummary}
            </Badge>
            {hasDirtyChanges && (
              <Badge className='rounded-full border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-50'>
                <Sparkles className='mr-1 size-3' />
                未保存 {dirtySectionCount} 个分区
              </Badge>
            )}
          </div>

          {expanded ? (
            <Textarea
              value={description ?? ''}
              onChange={(event) => onDescriptionChange(event.target.value)}
              className='mt-3 min-h-16 rounded-2xl text-xs font-bold text-muted-foreground'
              placeholder='说明这个业务事件源负责监听什么对象、什么生命周期。'
            />
          ) : (
            <p className='mt-3 line-clamp-2 text-xs font-bold text-muted-foreground'>
              {description?.trim() || '暂未添加业务事件源说明。'}
            </p>
          )}
        </div>
      </div>

      <div className='flex shrink-0 flex-wrap items-center justify-end gap-2'>
        <Button
          size='sm'
          variant='outline'
          className='h-10 rounded-2xl text-xs font-black'
          onClick={() => onExpandedChange(!expanded)}
        >
          {expanded ? (
            <ChevronDown className='size-3.5' />
          ) : (
            <ChevronRight className='size-3.5' />
          )}
          {expanded ? '收起' : '展开'}
        </Button>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        <Button
          size='sm'
          className='h-10 rounded-2xl text-xs font-black'
          disabled={savingAll || hasValidationErrors || !hasDirtyChanges}
          onClick={onSaveAll}
        >
          <Save className='size-3.5' />
          保存全部
        </Button>
        <Button
          size='sm'
          variant='outline'
          className='h-10 rounded-2xl text-xs font-black'
          onClick={onDuplicate}
        >
          <Copy className='size-3.5' />
          复制
        </Button>
        {canDelete && (
          <Button
            size='sm'
            variant='ghost'
            className='h-10 rounded-2xl text-xs font-black text-destructive'
            onClick={onDelete}
          >
            <Trash2 className='size-3.5' />
            删除
          </Button>
        )}
      </div>
    </div>
  )
}
