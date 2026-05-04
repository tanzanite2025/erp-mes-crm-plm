import { Sheet, SheetContent } from '@/components/ui/sheet'
import { type BusinessEventPhaseOption } from '../../workflow-core/data/business-event-phase-catalog'
import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'
import {
  type BusinessEventSourceItemChangeKind,
  type BusinessEventSourceRemovedItemSummary,
} from './business-event-source-card-diff'
import { FieldDrawer, StatusDrawer } from './business-event-source-card-drawers'

export type BusinessEventSourceDrawerMode = 'statuses' | 'fields' | null

interface BusinessEventSourceCardDrawerPanelProps {
  drawerMode: BusinessEventSourceDrawerMode
  statuses: BusinessEventSource['config']['statuses']
  statusPhaseOptions: BusinessEventPhaseOption[]
  fields: BusinessEventSource['config']['fields']
  persistedStatusIds: Set<string>
  persistedFieldIds: Set<string>
  statusDirty: boolean
  fieldDirty: boolean
  statusChangeSummary: string
  fieldChangeSummary: string
  removedStatusItems: BusinessEventSourceRemovedItemSummary[]
  removedFieldItems: BusinessEventSourceRemovedItemSummary[]
  statusSaveDisabled: boolean
  fieldSaveDisabled: boolean
  statusSaving: boolean
  fieldSaving: boolean
  statusUndoDisabled: boolean
  fieldUndoDisabled: boolean
  statusUndoing: boolean
  fieldUndoing: boolean
  statusFocusedItemId?: string | null
  fieldFocusedItemId?: string | null
  statusFocusedRemovedItemId?: string | null
  fieldFocusedRemovedItemId?: string | null
  statusForceOpenRemovedItems?: boolean
  fieldForceOpenRemovedItems?: boolean
  getStatusChangeType: (id?: string) => BusinessEventSourceItemChangeKind | null
  getFieldChangeType: (id?: string) => BusinessEventSourceItemChangeKind | null
  onOpenChange: (open: boolean) => void
  onAddStatus: () => void
  onUpdateStatus: (index: number, updates: Partial<BusinessEventSource['config']['statuses'][number]>) => void
  onMoveStatus: (index: number, direction: -1 | 1) => void
  onDeleteStatus: (index: number) => void
  onRestoreRemovedStatusItem: (id: string) => void
  onSaveStatuses: () => void
  onUndoStatuses?: () => void
  onAddField: () => void
  onUpdateField: (index: number, updates: Partial<BusinessEventSource['config']['fields'][number]>) => void
  onDeleteField: (index: number) => void
  onRestoreRemovedFieldItem: (id: string) => void
  onSaveFields: () => void
  onUndoFields?: () => void
}

export function BusinessEventSourceCardDrawerPanel({
  drawerMode,
  statuses,
  statusPhaseOptions,
  fields,
  persistedStatusIds,
  persistedFieldIds,
  statusDirty,
  fieldDirty,
  statusChangeSummary,
  fieldChangeSummary,
  removedStatusItems,
  removedFieldItems,
  statusSaveDisabled,
  fieldSaveDisabled,
  statusSaving,
  fieldSaving,
  statusUndoDisabled,
  fieldUndoDisabled,
  statusUndoing,
  fieldUndoing,
  statusFocusedItemId,
  fieldFocusedItemId,
  statusFocusedRemovedItemId,
  fieldFocusedRemovedItemId,
  statusForceOpenRemovedItems,
  fieldForceOpenRemovedItems,
  getStatusChangeType,
  getFieldChangeType,
  onOpenChange,
  onAddStatus,
  onUpdateStatus,
  onMoveStatus,
  onDeleteStatus,
  onRestoreRemovedStatusItem,
  onSaveStatuses,
  onUndoStatuses,
  onAddField,
  onUpdateField,
  onDeleteField,
  onRestoreRemovedFieldItem,
  onSaveFields,
  onUndoFields,
}: BusinessEventSourceCardDrawerPanelProps) {
  return (
    <Sheet open={drawerMode !== null} onOpenChange={onOpenChange}>
      <SheetContent className='w-full overflow-y-auto sm:max-w-4xl'>
        {drawerMode === 'statuses' && (
          <StatusDrawer
            statuses={statuses}
            phaseOptions={statusPhaseOptions}
            persistedStatusIds={persistedStatusIds}
            onAdd={onAddStatus}
            onUpdate={onUpdateStatus}
            onMove={onMoveStatus}
            onDelete={onDeleteStatus}
            getChangeType={getStatusChangeType}
            dirty={statusDirty}
            changeSummary={statusChangeSummary}
            removedItems={removedStatusItems}
            onRestoreRemovedItem={onRestoreRemovedStatusItem}
            onSave={onSaveStatuses}
            saveDisabled={statusSaveDisabled}
            saving={statusSaving}
            onUndo={onUndoStatuses}
            undoDisabled={statusUndoDisabled}
            undoing={statusUndoing}
            focusedItemId={statusFocusedItemId}
            focusedRemovedItemId={statusFocusedRemovedItemId}
            forceOpenRemovedItems={statusForceOpenRemovedItems}
            onClose={() => onOpenChange(false)}
          />
        )}
        {drawerMode === 'fields' && (
          <FieldDrawer
            fields={fields}
            persistedFieldIds={persistedFieldIds}
            onAdd={onAddField}
            onUpdate={onUpdateField}
            onDelete={onDeleteField}
            getChangeType={getFieldChangeType}
            dirty={fieldDirty}
            changeSummary={fieldChangeSummary}
            removedItems={removedFieldItems}
            onRestoreRemovedItem={onRestoreRemovedFieldItem}
            onSave={onSaveFields}
            saveDisabled={fieldSaveDisabled}
            saving={fieldSaving}
            onUndo={onUndoFields}
            undoDisabled={fieldUndoDisabled}
            undoing={fieldUndoing}
            focusedItemId={fieldFocusedItemId}
            focusedRemovedItemId={fieldFocusedRemovedItemId}
            forceOpenRemovedItems={fieldForceOpenRemovedItems}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
