import { type RefObject } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'
import { RESOLVER_TYPE_OPTIONS } from './business-event-source-card-constants'
import {
  type BusinessEventSourceItemChangeKind,
  type BusinessEventSourceRemovedItemSummary,
} from './business-event-source-card-diff'
import { readonlyFieldClass, rowToneClass } from './business-event-source-card-shared'
import {
  EditableList,
  IconDeleteButton,
  ItemChangeBadge,
} from './business-event-source-card-primitives'

interface BusinessEventSourceResolverSectionProps {
  resolvers: BusinessEventSource['config']['dynamicResolvers']
  persistedResolverIds: Set<string>
  dirty: boolean
  changeSummary: string
  saving: boolean
  saveDisabled: boolean
  undoAvailable: boolean
  undoDisabled: boolean
  undoing: boolean
  removedItems: BusinessEventSourceRemovedItemSummary[]
  sectionRef: RefObject<HTMLDivElement | null>
  focusedItemId?: string | null
  focusedRemovedItemId?: string | null
  forceOpenRemovedItems?: boolean
  alwaysOpen?: boolean
  onAdd: () => void
  onSave: () => void
  onUndo?: () => void
  onRestoreRemovedItem: (id: string) => void
  getChangeType: (id?: string) => BusinessEventSourceItemChangeKind | null
  onCodeChange: (index: number, value: string) => void
  onLabelChange: (index: number, value: string) => void
  onPathChange: (index: number, value: string) => void
  onTypeChange: (
    index: number,
    value: BusinessEventSource['config']['dynamicResolvers'][number]['type']
  ) => void
  onDelete: (index: number) => void
}

export function BusinessEventSourceResolverSection({
  resolvers,
  persistedResolverIds,
  dirty,
  changeSummary,
  saving,
  saveDisabled,
  undoAvailable,
  undoDisabled,
  undoing,
  removedItems,
  sectionRef,
  focusedItemId,
  focusedRemovedItemId,
  forceOpenRemovedItems,
  alwaysOpen,
  onAdd,
  onSave,
  onUndo,
  onRestoreRemovedItem,
  getChangeType,
  onCodeChange,
  onLabelChange,
  onPathChange,
  onTypeChange,
  onDelete,
}: BusinessEventSourceResolverSectionProps) {
  return (
    <div ref={sectionRef}>
      <EditableList
        title='动态接收人'
        summary={`${resolvers.length} 个来源，用于按单据字段动态解析通知或审批对象`}
        actionLabel='加来源'
        onAdd={onAdd}
        removedItems={removedItems}
        onRestoreRemovedItem={onRestoreRemovedItem}
        onSave={onSave}
        saveDisabled={saveDisabled}
        saving={saving}
        dirty={dirty}
        changeSummary={changeSummary}
        onUndo={undoAvailable ? onUndo : undefined}
        undoDisabled={undoDisabled}
        undoing={undoing}
        focusedRemovedItemId={focusedRemovedItemId}
        forceOpenRemovedItems={forceOpenRemovedItems}
        alwaysOpen={alwaysOpen}
      >
        {resolvers.map((resolver, index) => {
          const changeType = getChangeType(resolver.id)
          const isResolverIdentityLocked = persistedResolverIds.has(
            resolver.id ?? ''
          )
          const isFocused = focusedItemId === resolver.id
          return (
            <div
              key={resolver.id ?? `${resolver.code}-${index}`}
              className={cn(
                'grid grid-cols-[1fr_1fr_1fr_100px_72px_36px] gap-2 rounded-2xl border p-2',
                rowToneClass(changeType),
                isFocused && 'ring-2 ring-sky-300 ring-offset-1'
              )}
            >
              <Input
                value={resolver.code}
                readOnly={isResolverIdentityLocked}
                onChange={(event) => onCodeChange(index, event.target.value)}
                className={cn(
                  'h-9 rounded-2xl font-mono text-xs',
                  readonlyFieldClass(isResolverIdentityLocked)
                )}
              />
              <Input
                value={resolver.label}
                onChange={(event) => onLabelChange(index, event.target.value)}
                className='h-9 rounded-2xl text-xs font-bold'
              />
              <Input
                value={resolver.path}
                readOnly={isResolverIdentityLocked}
                onChange={(event) => onPathChange(index, event.target.value)}
                className={cn(
                  'h-9 rounded-2xl font-mono text-xs',
                  readonlyFieldClass(isResolverIdentityLocked)
                )}
              />
              <select
                value={resolver.type}
                disabled={isResolverIdentityLocked}
                onChange={(event) =>
                  onTypeChange(
                    index,
                    event.target.value as BusinessEventSource['config']['dynamicResolvers'][number]['type']
                  )
                }
                className={cn(
                  'h-9 rounded-2xl border border-input bg-background px-2 text-xs font-bold',
                  readonlyFieldClass(isResolverIdentityLocked)
                )}
              >
                {RESOLVER_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <div className='flex items-center justify-center'>
                <ItemChangeBadge changeType={changeType} />
              </div>
              <IconDeleteButton
                disabled={isResolverIdentityLocked}
                onClick={() => onDelete(index)}
              />
            </div>
          )
        })}
      </EditableList>
    </div>
  )
}
