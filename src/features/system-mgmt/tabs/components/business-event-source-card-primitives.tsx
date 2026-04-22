import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Edit3,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import {
  type BusinessEventSourceItemChangeKind,
  type BusinessEventSourceRemovedItemSummary,
} from './business-event-source-card-diff'

function changeToneClass(
  changeType?: BusinessEventSourceItemChangeKind | null
) {
  switch (changeType) {
    case 'added':
      return 'border-emerald-300 bg-emerald-50 text-emerald-700'
    case 'updated':
      return 'border-amber-300 bg-amber-50 text-amber-700'
    case 'removed':
      return 'border-destructive/30 bg-destructive/10 text-destructive'
    case 'reordered':
      return 'border-sky-300 bg-sky-50 text-sky-700'
    default:
      return ''
  }
}

function changeToneLabel(
  changeType?: BusinessEventSourceItemChangeKind | null
) {
  switch (changeType) {
    case 'added':
      return '新增'
    case 'updated':
      return '修改'
    case 'removed':
      return '删除'
    case 'reordered':
      return '排序'
    default:
      return ''
  }
}

export function SectionChangeBadge({
  dirty,
  summary,
}: {
  dirty?: boolean
  summary?: string
}) {
  if (!dirty) return null
  return (
    <Badge className='rounded-full border-amber-300 bg-amber-50 text-xs font-black text-amber-700 hover:bg-amber-50'>
      {summary || '未保存'}
    </Badge>
  )
}

export function ItemChangeBadge({
  changeType,
}: {
  changeType?: BusinessEventSourceItemChangeKind | null
}) {
  if (!changeType) return null
  return (
    <Badge
      variant='outline'
      className={cn(
        'rounded-full text-xs font-black',
        changeToneClass(changeType)
      )}
    >
      {changeToneLabel(changeType)}
    </Badge>
  )
}

export function RemovedItemsPanel({
  items,
  onRestoreItem,
  focusedItemId,
  forceOpen,
}: {
  items?: BusinessEventSourceRemovedItemSummary[]
  onRestoreItem?: (id: string) => void
  focusedItemId?: string | null
  forceOpen?: boolean
}) {
  const focusedItemRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!focusedItemId || !focusedItemRef.current) return
    focusedItemRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }, [focusedItemId, forceOpen])

  if (!items || items.length === 0) return null
  return (
    <details
      className='rounded-2xl border border-dashed border-destructive/30 bg-destructive/5 p-3'
      open={forceOpen || undefined}
    >
      <summary className='flex cursor-pointer list-none items-center gap-2 text-xs font-black text-destructive marker:hidden'>
        <ChevronDown className='size-3.5 shrink-0' />
        已删除 {items.length} 项
      </summary>
      <div className='mt-3 flex flex-col gap-2'>
        {items.map((item) => {
          const isFocused = focusedItemId === item.id
          return (
            <div
              key={item.id}
              ref={isFocused ? focusedItemRef : null}
              className={cn(
                'flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/20 bg-background px-3 py-2',
                isFocused && 'ring-2 ring-destructive/40 ring-offset-1'
              )}
            >
              <div className='flex min-w-0 flex-wrap items-center gap-2 text-xs text-destructive'>
                <span className='truncate font-black'>{item.label}</span>
                <span className='font-mono text-muted-foreground'>
                  {item.code}
                </span>
                <span className='text-muted-foreground'>{item.meta}</span>
              </div>
              {onRestoreItem && (
                <Button
                  size='sm'
                  variant='outline'
                  className='h-8 rounded-2xl border-destructive/20 text-xs font-black text-destructive hover:bg-destructive/5'
                  onClick={() => onRestoreItem(item.id)}
                >
                  <RotateCcw className='size-3.5' />
                  恢复
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </details>
  )
}

export function SectionActions({
  onSave,
  saveDisabled,
  saving,
  saveLabel = '保存',
  onEdit,
  editLabel = '编辑',
  onUndo,
  undoDisabled,
  undoing,
}: {
  onSave?: () => void
  saveDisabled?: boolean
  saving?: boolean
  saveLabel?: string
  onEdit?: () => void
  editLabel?: string
  onUndo?: () => void
  undoDisabled?: boolean
  undoing?: boolean
}) {
  return (
    <div className='flex items-center gap-2'>
      {onUndo && (
        <Button
          size='sm'
          variant='outline'
          className='h-8 rounded-2xl text-xs font-black'
          disabled={undoDisabled || undoing}
          onClick={onUndo}
        >
          <RotateCcw className='size-3.5' />
          撤销
        </Button>
      )}
      {onSave && (
        <Button
          size='sm'
          className='h-8 rounded-2xl text-xs font-black'
          disabled={saveDisabled || saving}
          onClick={onSave}
        >
          <Save className='size-3.5' />
          {saveLabel}
        </Button>
      )}
      {onEdit && (
        <Button
          size='sm'
          variant='outline'
          className='h-8 rounded-2xl text-xs font-black'
          onClick={onEdit}
        >
          <Edit3 className='size-3.5' />
          {editLabel}
        </Button>
      )}
    </div>
  )
}

export function SummaryPanel({
  title,
  summary,
  items,
  removedItems,
  onRestoreRemovedItem,
  onEdit,
  onSave,
  saveDisabled,
  saving,
  dirty,
  changeSummary,
  onUndo,
  undoDisabled,
  undoing,
  focusedRemovedItemId,
  forceOpenRemovedItems,
}: {
  title: string
  summary: string
  items: Array<{
    id?: string
    code: string
    label: string
    meta: string
    changeType?: BusinessEventSourceItemChangeKind | null
  }>
  removedItems?: BusinessEventSourceRemovedItemSummary[]
  onRestoreRemovedItem?: (id: string) => void
  onEdit: () => void
  onSave?: () => void
  saveDisabled?: boolean
  saving?: boolean
  dirty?: boolean
  changeSummary?: string
  onUndo?: () => void
  undoDisabled?: boolean
  undoing?: boolean
  focusedRemovedItemId?: string | null
  forceOpenRemovedItems?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (dirty || focusedRemovedItemId || forceOpenRemovedItems) {
      setIsOpen(true)
    }
  }, [dirty, focusedRemovedItemId, forceOpenRemovedItems])

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        'rounded-2xl border border-dashed border-muted/40 bg-muted/10 p-3',
        dirty && 'border-amber-300/80 bg-amber-50/40'
      )}
    >
      <div className='flex items-center justify-between gap-2'>
        <div className='flex min-w-0 flex-col gap-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h4 className='text-xs font-black tracking-tight'>{title}</h4>
            <SectionChangeBadge dirty={dirty} summary={changeSummary} />
          </div>
          <p className='text-xs font-bold text-muted-foreground'>{summary}</p>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <SectionActions
            onSave={onSave}
            saveDisabled={saveDisabled}
            saving={saving}
            onEdit={onEdit}
            onUndo={onUndo}
            undoDisabled={undoDisabled}
            undoing={undoing}
          />
          <Button
            size='icon'
            variant='ghost'
            className='size-8 rounded-2xl'
            onClick={() => setIsOpen((value) => !value)}
            aria-label={isOpen ? '收起分区' : '展开分区'}
          >
            <ChevronDown
              className={cn(
                'size-4 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </Button>
        </div>
      </div>
      <CollapsibleContent className='overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'>
        <div className='mt-3 flex flex-wrap gap-2'>
          {items.slice(0, 12).map((item) => (
            <Badge
              key={item.id ?? `${item.code}-${item.label}`}
              variant='outline'
              className={cn(
                'max-w-full gap-1 rounded-full px-2 py-1 text-xs',
                changeToneClass(item.changeType)
              )}
            >
              <span className='truncate font-black'>{item.label}</span>
              <span className='font-mono text-muted-foreground'>
                {item.code}
              </span>
              <span className='text-muted-foreground'>{item.meta}</span>
            </Badge>
          ))}
          {items.length > 12 && (
            <Badge variant='secondary' className='rounded-full text-xs'>
              +{items.length - 12}
            </Badge>
          )}
        </div>
        <div className='mt-3'>
          <RemovedItemsPanel
            items={removedItems}
            onRestoreItem={onRestoreRemovedItem}
            focusedItemId={focusedRemovedItemId}
            forceOpen={forceOpenRemovedItems}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function EditableList({
  title,
  summary,
  actionLabel,
  onAdd,
  children,
  removedItems,
  onRestoreRemovedItem,
  onSave,
  saveDisabled,
  saving,
  dirty,
  changeSummary,
  onUndo,
  undoDisabled,
  undoing,
  focusedRemovedItemId,
  forceOpenRemovedItems,
}: {
  title: string
  summary: string
  actionLabel: string
  onAdd: () => void
  children: React.ReactNode
  removedItems?: BusinessEventSourceRemovedItemSummary[]
  onRestoreRemovedItem?: (id: string) => void
  onSave?: () => void
  saveDisabled?: boolean
  saving?: boolean
  dirty?: boolean
  changeSummary?: string
  onUndo?: () => void
  undoDisabled?: boolean
  undoing?: boolean
  focusedRemovedItemId?: string | null
  forceOpenRemovedItems?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (dirty || focusedRemovedItemId || forceOpenRemovedItems) {
      setIsOpen(true)
    }
  }, [dirty, focusedRemovedItemId, forceOpenRemovedItems])

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        'rounded-2xl border border-dashed border-muted/40 bg-muted/10 p-3',
        dirty && 'border-amber-300/80 bg-amber-50/40'
      )}
    >
      <div className='flex items-center justify-between gap-2'>
        <div className='flex min-w-0 flex-col gap-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h4 className='text-xs font-black tracking-tight'>{title}</h4>
            <SectionChangeBadge dirty={dirty} summary={changeSummary} />
          </div>
          <p className='text-xs font-bold text-muted-foreground'>{summary}</p>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <SectionActions
            onSave={onSave}
            saveDisabled={saveDisabled}
            saving={saving}
            onUndo={onUndo}
            undoDisabled={undoDisabled}
            undoing={undoing}
          />
          {isOpen && (
            <Button
              size='sm'
              variant='outline'
              className='h-8 rounded-2xl text-xs font-black'
              onClick={onAdd}
            >
              <Plus className='size-3.5' />
              {actionLabel}
            </Button>
          )}
          <Button
            size='icon'
            variant='ghost'
            className='size-8 rounded-2xl'
            onClick={() => setIsOpen((value) => !value)}
            aria-label={isOpen ? '收起分区' : '展开分区'}
          >
            <ChevronDown
              className={cn(
                'size-4 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </Button>
        </div>
      </div>
      <CollapsibleContent className='overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'>
        <div className='mt-3 overflow-x-auto'>
          <div className='flex min-w-[640px] flex-col gap-2'>{children}</div>
        </div>
        <div className='mt-3'>
          <RemovedItemsPanel
            items={removedItems}
            onRestoreItem={onRestoreRemovedItem}
            focusedItemId={focusedRemovedItemId}
            forceOpen={forceOpenRemovedItems}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function MiniToggle({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'h-9 rounded-2xl border px-2 text-xs font-black',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-background text-muted-foreground'
      )}
    >
      {label}
    </button>
  )
}

export function StatusMoveControls({
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className='flex items-center gap-1'>
      <Button
        size='icon'
        variant='outline'
        className='size-9 rounded-2xl'
        disabled={!canMoveUp}
        onClick={onMoveUp}
        title='上移状态'
      >
        <ArrowUp className='size-3.5' />
      </Button>
      <Button
        size='icon'
        variant='outline'
        className='size-9 rounded-2xl'
        disabled={!canMoveDown}
        onClick={onMoveDown}
        title='下移状态'
      >
        <ArrowDown className='size-3.5' />
      </Button>
    </div>
  )
}

export function IconDeleteButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      size='icon'
      variant='ghost'
      className='size-9 rounded-2xl text-destructive disabled:cursor-not-allowed disabled:opacity-35'
      onClick={onClick}
      disabled={disabled}
    >
      <Trash2 className='size-3.5' />
    </Button>
  )
}
