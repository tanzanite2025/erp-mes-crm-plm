import { type RefObject } from 'react'
import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'
import { getBusinessEventStatusLabel } from '../../workflow-core/data/business-event-status-catalog'
import {
  type BusinessEventSourceItemChangeKind,
  type BusinessEventSourceRemovedItemSummary,
} from './business-event-source-card-diff'
import { SummaryPanel } from './business-event-source-card-primitives'

interface BusinessEventSourceStatusSectionProps {
  statuses: BusinessEventSource['config']['statuses']
  sourceCode: string
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
  alwaysOpen?: boolean
  getChangeType: (id?: string) => BusinessEventSourceItemChangeKind | null
  onRestoreRemovedItem: (id: string) => void
  onSave: () => void
  onUndo?: () => void
  onEdit: () => void
}

export function BusinessEventSourceStatusSection({
  statuses,
  sourceCode,
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
  alwaysOpen,
  getChangeType,
  onRestoreRemovedItem,
  onSave,
  onUndo,
  onEdit,
}: BusinessEventSourceStatusSectionProps) {
  return (
    <div ref={sectionRef}>
      <SummaryPanel
        title='状态'
        summary={summary}
        items={statuses.map((status) => ({
          id: status.id,
          code: status.code,
          label: getBusinessEventStatusLabel(sourceCode, status.code),
          meta: '唯一状态',
          changeType: getChangeType(status.id),
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
        alwaysOpen={alwaysOpen}
      />
    </div>
  )
}
