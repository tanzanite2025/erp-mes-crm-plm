import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  canonicalizeBusinessStatusCode,
  type BusinessEventField,
  type BusinessStatus,
} from '../../workflow-core/data/business-event-source-schema'
import { getBusinessEventStatusLabel } from '../../workflow-core/data/business-event-status-catalog'
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
import { type BusinessEventStatusReferenceSummary } from './business-event-source-status-references'

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

function statusIdentityHint({
  locked,
  isReferenced,
}: {
  locked?: boolean
  isReferenced?: boolean
}) {
  if (locked && isReferenced) {
    return '已落库且已被规则引用，编码身份只读。'
  }
  return locked ? '已落库状态，编码身份只读。' : '输入规则监听使用的唯一状态码。'
}

function buildStatusReferenceHint(
  summary: BusinessEventStatusReferenceSummary | undefined,
  loaded: boolean,
  persisted: boolean
) {
  if (!persisted) {
    return '未保存状态，当前不参与规则引用统计。'
  }
  if (!loaded) {
    return '规则引用加载中，暂不允许删除已落库状态。'
  }
  if (!summary?.isReferenced) {
    return '当前未被规则链路引用，删除前仍需二次确认。'
  }

  const fragments: string[] = []
  if (summary.targetSegmentCount > 0) {
    fragments.push(`触发 ${summary.targetSegmentCount}`)
  }
  if (summary.resolveSegmentCount > 0) {
    fragments.push(`归档 ${summary.resolveSegmentCount}`)
  }
  if (summary.approvalActionCount > 0) {
    fragments.push(`审批 ${summary.approvalActionCount}`)
  }

  return `规则占用：${fragments.join(' / ')}`
}

export function StatusEditorContent({
  statuses,
  sourceCode,
  persistedStatusIds,
  statusReferenceMap,
  statusReferencesLoaded,
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
  sourceCode: string
  persistedStatusIds?: Set<string>
  statusReferenceMap?: Map<string, BusinessEventStatusReferenceSummary>
  statusReferencesLoaded?: boolean
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
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!focusedItemId || !focusedRowRef.current) return
    focusedRowRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [focusedItemId])

  const pendingDeleteStatus =
    pendingDeleteIndex !== null ? statuses[pendingDeleteIndex] : null

  return (
    <>
      <div className='flex h-full min-h-0 flex-col'>
        <div className='border-b border-dashed border-muted/30 px-6 py-5'>
        <div className='flex items-center gap-2'>
          <h3 className='text-sm font-black tracking-tight italic'>状态配置</h3>
          <SectionChangeBadge dirty={dirty} summary={changeSummary} />
        </div>
        <p className='mt-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
          维护这个业务对象可监听的全部状态，顺序会影响规则表单里的展示顺序。
        </p>
        </div>
        <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-5'>
        <Button
          type='button'
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
            const canonicalCode = canonicalizeBusinessStatusCode(
              sourceCode,
              status.code
            )
            const statusReference = statusReferenceMap?.get(status.code)
            const deleteDisabled =
              isStatusIdentityLocked &&
              (!statusReferencesLoaded || Boolean(statusReference?.isReferenced))
            return (
              <div
                key={status.id ?? `${status.code}-${index}`}
                ref={isFocused ? focusedRowRef : null}
                className={cn(
                  'grid gap-3 rounded-2xl border p-3 lg:grid-cols-[minmax(0,1fr)_auto]',
                  drawerRowTone(changeType),
                  isFocused && 'ring-2 ring-sky-300 ring-offset-1'
                )}
              >
                <div className='grid gap-3 md:grid-cols-[minmax(220px,0.95fr)_minmax(220px,1fr)]'>
                  <div className='space-y-1.5'>
                    <div className='px-1 text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>
                      状态码 / Code
                    </div>
                    <Input
                      value={status.code}
                      readOnly={isStatusIdentityLocked}
                      onChange={(event) =>
                        onUpdate(index, { code: event.target.value })
                      }
                      className={cn(
                        'h-10 rounded-2xl border-none bg-background/85 font-mono text-xs shadow-inner',
                        drawerReadonlyFieldClass(isStatusIdentityLocked)
                      )}
                      placeholder='Pending'
                    />
                    <div className='px-1 text-[8px] font-black uppercase tracking-widest text-muted-foreground/40'>
                      {statusIdentityHint({
                        locked: isStatusIdentityLocked,
                        isReferenced: statusReference?.isReferenced,
                      })}
                    </div>
                    <div className='px-1 text-[8px] font-black uppercase tracking-widest text-muted-foreground/35'>
                      最终存储：{canonicalCode || '待生成'}
                    </div>
                    <div className='px-1 text-[8px] font-black uppercase tracking-widest text-muted-foreground/45'>
                      {buildStatusReferenceHint(
                        statusReference,
                        statusReferencesLoaded ?? false,
                        isStatusIdentityLocked
                      )}
                    </div>
                  </div>

                  <div className='space-y-1.5'>
                    <div className='px-1 text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>
                      状态名称 / Label
                    </div>
                    <div className='flex min-h-10 items-center rounded-2xl border border-dashed border-muted/30 bg-muted/10 px-3 text-xs font-black text-foreground'>
                      {getBusinessEventStatusLabel(
                        sourceCode,
                        canonicalCode || status.code
                      )}
                    </div>
                    <div className='flex flex-wrap items-center gap-2 px-1'>
                      <span className='inline-flex h-5 items-center rounded-full border border-dashed border-muted/40 bg-background/80 px-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/70'>
                        唯一状态
                      </span>
                      {statusReference?.isReferenced ? (
                        <span className='inline-flex h-5 items-center rounded-full border border-dashed border-amber-300/60 bg-amber-50/90 px-2 text-[8px] font-black uppercase tracking-widest text-amber-700'>
                          已引用
                        </span>
                      ) : null}
                      {isStatusIdentityLocked ? (
                        <span className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/40'>
                          Persisted Identity
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className='flex items-center justify-between gap-2 rounded-2xl border border-dashed border-muted/30 bg-background/50 px-3 py-2 lg:min-w-[140px] lg:justify-end'>
                  <div className='flex items-center gap-2'>
                    <ItemChangeBadge changeType={changeType} />
                    <StatusMoveControls
                      canMoveUp={index > 0}
                      canMoveDown={index < statuses.length - 1}
                      onMoveUp={() => onMove(index, -1)}
                      onMoveDown={() => onMove(index, 1)}
                    />
                    <IconDeleteButton
                      disabled={deleteDisabled}
                      onClick={() => {
                        if (deleteDisabled) {
                          return
                        }
                        if (isStatusIdentityLocked) {
                          setPendingDeleteIndex(index)
                          return
                        }
                        onDelete(index)
                      }}
                    />
                  </div>
                </div>
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
        <div className='flex items-center justify-between gap-2 border-t border-dashed border-muted/30 px-6 py-4'>
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
            type='button'
            variant='outline'
            className='rounded-2xl text-xs font-black'
            onClick={onClose}
          >
            完成
          </Button>
        </div>
        </div>
      </div>
      <AlertDialog
        open={pendingDeleteStatus !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteIndex(null)
          }
        }}
      >
        <AlertDialogContent className='rounded-[32px] border-none bg-background shadow-2xl'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-black tracking-tighter italic uppercase'>
              删除已落库状态
            </AlertDialogTitle>
            <AlertDialogDescription className='text-[11px] font-bold leading-6 text-muted-foreground'>
              {pendingDeleteStatus
                ? `状态 ${pendingDeleteStatus.code} 当前未被规则链路引用，但删除后会从事件源配置中移除。请确认这不是一个仍需长期保留的业务状态。`
                : '请确认是否删除该状态。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='gap-2'>
            <AlertDialogCancel className='rounded-full text-[10px] font-black uppercase tracking-widest'>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className='rounded-full bg-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-700'
              onClick={() => {
                if (pendingDeleteIndex === null) {
                  return
                }
                onDelete(pendingDeleteIndex)
                setPendingDeleteIndex(null)
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function FieldEditorContent({
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
    <div className='flex h-full min-h-0 flex-col'>
      <div className='border-b border-dashed border-muted/30 px-6 py-5'>
        <div className='flex items-center gap-2'>
          <h3 className='text-sm font-black tracking-tight italic'>字段配置</h3>
          <SectionChangeBadge dirty={dirty} summary={changeSummary} />
        </div>
        <p className='mt-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
          维护模板变量、动态接收人来源字段，以及事件元数据 path。
        </p>
      </div>
      <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-5'>
        <Button
          type='button'
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
      <div className='flex items-center justify-between gap-2 border-t border-dashed border-muted/30 px-6 py-4'>
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
            type='button'
            variant='outline'
            className='rounded-2xl text-xs font-black'
            onClick={onClose}
          >
            完成
          </Button>
        </div>
      </div>
    </div>
  )
}
