import { type RefObject } from 'react'
import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'
import {
  type BusinessEventSourceItemChangeKind,
  type BusinessEventSourceRemovedItemSummary,
} from './business-event-source-card-diff'
import { SummaryPanel } from './business-event-source-card-primitives'

interface BusinessEventSourceFieldSectionProps {
  fields: BusinessEventSource['config']['fields']
  summary: string
  dirty: boolean
  changeSummary: string
  saving: boolean
  saveDisabled: boolean
  undoAvailable: boolean
  undoDisabled: boolean
  undoing: boolean
  removedItems: BusinessEventSourceRemovedItemSummary[]
  sectionRef: RefObject<HTMLDivElement | null>
  focusedRemovedItemId?: string | null
  forceOpenRemovedItems?: boolean
  getChangeType: (id?: string) => BusinessEventSourceItemChangeKind | null
  onRestoreRemovedItem: (id: string) => void
  onSave: () => void
  onUndo?: () => void
  onEdit: () => void
}

export function BusinessEventSourceFieldSection({
  fields,
  summary,
  dirty,
  changeSummary,
  saving,
  saveDisabled,
  undoAvailable,
  undoDisabled,
  undoing,
  removedItems,
  sectionRef,
  focusedRemovedItemId,
  forceOpenRemovedItems,
  getChangeType,
  onRestoreRemovedItem,
  onSave,
  onUndo,
  onEdit,
}: BusinessEventSourceFieldSectionProps) {
  return (
    <div ref={sectionRef}>
      <SummaryPanel
        title='字段'
        summary={summary}
        items={fields.map((field) => ({
          id: field.id,
          code: field.key,
          label: field.label,
          meta: field.type,
          changeType: getChangeType(field.id),
        }))}
        removedItems={removedItems}
        onRestoreRemovedItem={onRestoreRemovedItem}
        dirty={dirty}
        changeSummary={changeSummary}
        onSave={onSave}
        saveDisabled={saveDisabled}
        saving={saving}
        onUndo={undoAvailable ? onUndo : undefined}
        undoDisabled={undoDisabled}
        undoing={undoing}
        onEdit={onEdit}
        focusedRemovedItemId={focusedRemovedItemId}
        forceOpenRemovedItems={forceOpenRemovedItems}
      />
    </div>
  )
}
