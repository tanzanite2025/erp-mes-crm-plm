import { useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  type BusinessEventField,
  type BusinessStatus,
} from '../../workflow-core/data/business-event-source-schema'
import { type BusinessEventPhaseOption } from '../../workflow-core/data/business-event-phase-catalog'
import { FIELD_TYPE_OPTIONS } from './business-event-source-card-constants'
import {
  type BusinessEventSourceItemChangeKind,
  type BusinessEventSourceRemovedItemSummary,
} from './business-event-source-card-diff'
import {
  IconDeleteButton,
  ItemChangeBadge,
  MiniToggle,
  RemovedItemsPanel,
  SectionActions,
  SectionChangeBadge,
  StatusMoveControls,
} from './business-event-source-card-primitives'

function drawerRowTone(changeType?: BusinessEventSourceItemChangeKind | null) {
  switch (changeType) {
    case 'added':
      return 'border-emerald-300 bg-emerald-50/80'
    case 'updated':
      return 'border-amber-300 bg-amber-50/80'
    case 'reordered':
      return 'border-sky-300 bg-sky-50/80'
    default:
      return 'border-muted/30 bg-muted/10'
  }
}

function drawerReadonlyFieldClass(locked?: boolean) {
  return locked ? 'bg-muted/40 text-muted-foreground cursor-not-allowed' : ''
}

export function StatusDrawer({
  statuses,
  phaseOptions,
  persistedStatusIds,
  onAdd,
  onUpdate,
  onMove,
  onDelete,
  onClose,
  getChangeType,
  dirty,
  changeSummary,
  onSave,
  saveDisabled,
  saving,
  removedItems,
  onRestoreRemovedItem,
  onUndo,
  undoDisabled,
  undoing,
  focusedItemId,
  focusedRemovedItemId,
  forceOpenRemovedItems,
}: {
  statuses: BusinessStatus[]
  phaseOptions: BusinessEventPhaseOption[]
  persistedStatusIds?: Set<string>
  onAdd: () => void
  onUpdate: (index: number, updates: Partial<BusinessStatus>) => void
  onMove: (index: number, direction: -1 | 1) => void
  onDelete: (index: number) => void
  onClose: () => void
  getChangeType?: (id?: string) => BusinessEventSourceItemChangeKind | null
  dirty?: boolean
  changeSummary?: string
  onSave?: () => void
  saveDisabled?: boolean
  saving?: boolean
  removedItems?: BusinessEventSourceRemovedItemSummary[]
  onRestoreRemovedItem?: (id: string) => void
  onUndo?: () => void
  undoDisabled?: boolean
  undoing?: boolean
  focusedItemId?: string | null
  focusedRemovedItemId?: string | null
  forceOpenRemovedItems?: boolean
}) {
  const focusedRowRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!focusedItemId || !focusedRowRef.current) return
    focusedRowRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [focusedItemId])

  return (
    <>
      <SheetHeader>
        <div className='flex items-center gap-2'>
          <SheetTitle className='text-base font-black'>状态配置</SheetTitle>
          <SectionChangeBadge dirty={dirty} summary={changeSummary} />
        </div>
        <SheetDescription>
          维护这个业务对象可监听的全部状态，顺序会影响规则表单里的展示顺序。
        </SheetDescription>
      </SheetHeader>
      <div className='flex flex-col gap-3 px-4 pb-4'>
        <Button
          variant='outline'
          className='w-fit rounded-2xl text-xs font-black'
          onClick={onAdd}
        >
          <Plus className='size-3.5' />
          新增状态
        </Button>
        <div className='flex flex-col gap-2'>
          {statuses.map((status, index) => {
            const changeType = getChangeType?.(status.id)
            const isStatusIdentityLocked =
              persistedStatusIds?.has(status.id ?? '') ?? false
            const isFocused = focusedItemId === status.id
            return (
              <div
                key={status.id ?? `${status.code}-${index}`}
                ref={isFocused ? focusedRowRef : null}
                className={cn(
                  'grid min-w-[720px] grid-cols-[64px_1fr_1fr_130px_72px_72px_72px_36px] gap-2 rounded-2xl border p-2',
                  drawerRowTone(changeType),
                  isFocused && 'ring-2 ring-sky-300 ring-offset-1'
                )}
              >
                <StatusMoveControls
                  canMoveUp={index > 0}
                  canMoveDown={index < statuses.length - 1}
                  onMoveUp={() => onMove(index, -1)}
                  onMoveDown={() => onMove(index, 1)}
                />
                <Input
                  value={status.code}
                  readOnly={isStatusIdentityLocked}
                  onChange={(event) =>
                    onUpdate(index, { code: event.target.value })
                  }
                  className={cn(
                    'h-9 rounded-2xl font-mono text-xs',
                    drawerReadonlyFieldClass(isStatusIdentityLocked)
                  )}
                  placeholder='Pending'
                />
                <Input
                  value={status.label}
                  onChange={(event) =>
                    onUpdate(index, { label: event.target.value })
                  }
                  className='h-9 rounded-2xl text-xs font-bold'
                  placeholder='待处理'
                />
                <select
                  value={status.phase}
                  disabled={isStatusIdentityLocked}
                  onChange={(event) =>
                    onUpdate(index, {
                      phase: event.target.value as BusinessStatus['phase'],
                    })
                  }
                  className={cn(
                    'h-9 rounded-2xl border border-input bg-background px-2 text-xs font-bold',
                    drawerReadonlyFieldClass(isStatusIdentityLocked)
                  )}
                >
                  {phaseOptions.map((phase) => (
                    <option key={phase.value} value={phase.value}>
                      {phase.label}
                    </option>
                  ))}
                </select>
                <MiniToggle
                  active={status.isTerminal}
                  label='终态'
                  onClick={() =>
                    onUpdate(index, { isTerminal: !status.isTerminal })
                  }
                />
                <MiniToggle
                  active={status.defaultResolve}
                  label='归档'
                  onClick={() =>
                    onUpdate(index, {
                      defaultResolve: !status.defaultResolve,
                    })
                  }
                />
                <div className='flex items-center justify-center'>
                  <ItemChangeBadge changeType={changeType} />
                </div>
                <IconDeleteButton
                  disabled={isStatusIdentityLocked}
                  onClick={() => onDelete(index)}
                />
              </div>
            )
          })}
        </div>
        <RemovedItemsPanel
          items={removedItems}
          onRestoreItem={onRestoreRemovedItem}
          focusedItemId={focusedRemovedItemId}
          forceOpen={forceOpenRemovedItems}
        />
      </div>
      <SheetFooter>
        <div className='flex w-full items-center justify-between gap-2'>
          <SectionChangeBadge dirty={dirty} summary={changeSummary} />
          <div className='flex items-center gap-2'>
            <SectionActions
              onUndo={onUndo}
              undoDisabled={undoDisabled}
              undoing={undoing}
              onSave={onSave}
              saveDisabled={saveDisabled}
              saving={saving}
              saveLabel='保存状态'
            />
            <Button
              variant='outline'
              className='rounded-2xl text-xs font-black'
              onClick={onClose}
            >
              完成
            </Button>
          </div>
        </div>
      </SheetFooter>
    </>
  )
}

export function FieldDrawer({
  fields,
  persistedFieldIds,
  onAdd,
  onUpdate,
  onDelete,
  onClose,
  getChangeType,
  dirty,
  changeSummary,
  onSave,
  saveDisabled,
  saving,
  removedItems,
  onRestoreRemovedItem,
  onUndo,
  undoDisabled,
  undoing,
  focusedItemId,
  focusedRemovedItemId,
  forceOpenRemovedItems,
}: {
  fields: BusinessEventField[]
  persistedFieldIds?: Set<string>
  onAdd: () => void
  onUpdate: (index: number, updates: Partial<BusinessEventField>) => void
  onDelete: (index: number) => void
  onClose: () => void
  getChangeType?: (id?: string) => BusinessEventSourceItemChangeKind | null
  dirty?: boolean
  changeSummary?: string
  onSave?: () => void
  saveDisabled?: boolean
  saving?: boolean
  removedItems?: BusinessEventSourceRemovedItemSummary[]
  onRestoreRemovedItem?: (id: string) => void
  onUndo?: () => void
  undoDisabled?: boolean
  undoing?: boolean
  focusedItemId?: string | null
  focusedRemovedItemId?: string | null
  forceOpenRemovedItems?: boolean
}) {
  const focusedRowRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!focusedItemId || !focusedRowRef.current) return
    focusedRowRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [focusedItemId])

  return (
    <>
      <SheetHeader>
        <div className='flex items-center gap-2'>
          <SheetTitle className='text-base font-black'>字段配置</SheetTitle>
          <SectionChangeBadge dirty={dirty} summary={changeSummary} />
        </div>
        <SheetDescription>
          维护模板变量、动态接收人来源字段，以及事件元数据 path。
        </SheetDescription>
      </SheetHeader>
      <div className='flex flex-col gap-3 px-4 pb-4'>
        <Button
          variant='outline'
          className='w-fit rounded-2xl text-xs font-black'
          onClick={onAdd}
        >
          <Plus className='size-3.5' />
          新增字段
        </Button>
        <div className='flex flex-col gap-2'>
          {fields.map((field, index) => {
            const changeType = getChangeType?.(field.id)
            const isFieldIdentityLocked =
              persistedFieldIds?.has(field.id ?? '') ?? false
            const isFocused = focusedItemId === field.id
            return (
              <div
                key={field.id ?? `${field.key}-${index}`}
                ref={isFocused ? focusedRowRef : null}
                className={cn(
                  'grid min-w-[900px] grid-cols-[1fr_1fr_1fr_110px_120px_72px_72px_72px_36px] gap-2 rounded-2xl border p-2',
                  drawerRowTone(changeType),
                  isFocused && 'ring-2 ring-sky-300 ring-offset-1'
                )}
              >
                <Input
                  value={field.key}
                  readOnly={isFieldIdentityLocked}
                  onChange={(event) =>
                    onUpdate(index, { key: event.target.value })
                  }
                  className={cn(
                    'h-9 rounded-2xl font-mono text-xs',
                    drawerReadonlyFieldClass(isFieldIdentityLocked)
                  )}
                  placeholder='orderNo'
                />
                <Input
                  value={field.label}
                  onChange={(event) =>
                    onUpdate(index, { label: event.target.value })
                  }
                  className='h-9 rounded-2xl text-xs font-bold'
                  placeholder='订单号'
                />
                <Input
                  value={field.path}
                  readOnly={isFieldIdentityLocked}
                  onChange={(event) =>
                    onUpdate(index, { path: event.target.value })
                  }
                  className={cn(
                    'h-9 rounded-2xl font-mono text-xs',
                    drawerReadonlyFieldClass(isFieldIdentityLocked)
                  )}
                  placeholder='orderNo'
                />
                <select
                  value={field.type}
                  disabled={isFieldIdentityLocked}
                  onChange={(event) =>
                    onUpdate(index, {
                      type: event.target.value as BusinessEventField['type'],
                    })
                  }
                  className={cn(
                    'h-9 rounded-2xl border border-input bg-background px-2 text-xs font-bold',
                    drawerReadonlyFieldClass(isFieldIdentityLocked)
                  )}
                >
                  {FIELD_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <Input
                  value={field.templateKey ?? ''}
                  onChange={(event) =>
                    onUpdate(index, { templateKey: event.target.value })
                  }
                  className='h-9 rounded-2xl font-mono text-xs'
                  placeholder='OrderNo'
                />
                <MiniToggle
                  active={field.templateEnabled}
                  label='模板'
                  onClick={() =>
                    onUpdate(index, {
                      templateEnabled: !field.templateEnabled,
                    })
                  }
                />
                <MiniToggle
                  active={field.dynamicResolver}
                  label='路由'
                  onClick={() =>
                    onUpdate(index, {
                      dynamicResolver: !field.dynamicResolver,
                    })
                  }
                />
                <div className='flex items-center justify-center'>
                  <ItemChangeBadge changeType={changeType} />
                </div>
                <IconDeleteButton
                  disabled={isFieldIdentityLocked}
                  onClick={() => onDelete(index)}
                />
              </div>
            )
          })}
        </div>
        <RemovedItemsPanel
          items={removedItems}
          onRestoreItem={onRestoreRemovedItem}
          focusedItemId={focusedRemovedItemId}
          forceOpen={forceOpenRemovedItems}
        />
      </div>
      <SheetFooter>
        <div className='flex w-full items-center justify-between gap-2'>
          <SectionChangeBadge dirty={dirty} summary={changeSummary} />
          <div className='flex items-center gap-2'>
            <SectionActions
              onUndo={onUndo}
              undoDisabled={undoDisabled}
              undoing={undoing}
              onSave={onSave}
              saveDisabled={saveDisabled}
              saving={saving}
              saveLabel='保存字段'
            />
            <Button
              variant='outline'
              className='rounded-2xl text-xs font-black'
              onClick={onClose}
            >
              完成
            </Button>
          </div>
        </div>
      </SheetFooter>
    </>
  )
}
