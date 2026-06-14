import { type RefObject } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'
import { ACTION_KIND_OPTIONS } from './business-event-source-card-constants'
import {
  type BusinessEventSourceItemChangeKind,
  type BusinessEventSourceRemovedItemSummary,
} from './business-event-source-card-diff'
import {
  EditableList,
  IconDeleteButton,
  ItemChangeBadge,
} from './business-event-source-card-primitives'
import {
  readonlyFieldClass,
  rowToneClass,
} from './business-event-source-card-shared'

interface BusinessEventSourceActionSectionProps {
  actions: BusinessEventSource['config']['actions']
  persistedActionIds: Set<string>
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
  onNameChange: (index: number, value: string) => void
  onKindChange: (
    index: number,
    value: BusinessEventSource['config']['actions'][number]['kind']
  ) => void
  onDelete: (index: number) => void
}

export function BusinessEventSourceActionSection({
  actions,
  persistedActionIds,
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
  onNameChange,
  onKindChange,
  onDelete,
}: BusinessEventSourceActionSectionProps) {
  return (
    <div ref={sectionRef}>
      <EditableList
        title='动作'
        summary={`${actions.length} 个动作，定义业务事件可监听的生命周期动作`}
        actionLabel='加动作'
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
        {actions.map((action, index) => {
          const changeType = getChangeType(action.id)
          const isActionIdentityLocked = persistedActionIds.has(action.id ?? '')
          const isFocused = focusedItemId === action.id
          return (
            <div
              key={action.id ?? `${action.code}-${index}`}
              className={cn(
                'grid grid-cols-[1fr_1fr_120px_72px_36px] gap-2 rounded-2xl border p-2',
                rowToneClass(changeType),
                isFocused && 'ring-2 ring-sky-300 ring-offset-1'
              )}
            >
              <Input
                value={action.code}
                readOnly={isActionIdentityLocked}
                onChange={(event) => onCodeChange(index, event.target.value)}
                className={cn(
                  'h-9 rounded-2xl font-mono text-xs',
                  readonlyFieldClass(isActionIdentityLocked)
                )}
              />
              <Input
                value={action.name}
                onChange={(event) => onNameChange(index, event.target.value)}
                className='h-9 rounded-2xl text-xs font-bold'
              />
              <select
                value={action.kind}
                disabled={isActionIdentityLocked}
                onChange={(event) =>
                  onKindChange(
                    index,
                    event.target
                      .value as BusinessEventSource['config']['actions'][number]['kind']
                  )
                }
                className={cn(
                  'h-9 rounded-2xl border border-input bg-background px-2 text-xs font-bold',
                  readonlyFieldClass(isActionIdentityLocked)
                )}
              >
                {ACTION_KIND_OPTIONS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
              <div className='flex items-center justify-center'>
                <ItemChangeBadge changeType={changeType} />
              </div>
              <IconDeleteButton
                disabled={isActionIdentityLocked}
                onClick={() => onDelete(index)}
              />
            </div>
          )
        })}
      </EditableList>
    </div>
  )
}
