import { type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'
import {
  applyBusinessEventSourceSectionPatch,
  buildBusinessEventSourceSectionPatch,
  extractBusinessEventSourceSectionPatch,
  type BusinessEventSourceSection,
  type BusinessEventSourceSectionPatch,
} from './business-event-source-card-diff'
import { cloneBusinessEventSource } from './business-event-source-card-utils'

type SavingState = Record<BusinessEventSourceSection, boolean>
export type UndoPatchState = Record<
  BusinessEventSourceSection,
  BusinessEventSourceSectionPatch | null
>

interface RestoreRemovedBusinessEventSourceItemOptions<
  T extends { id?: string },
> {
  sectionLabel: string
  id: string
  items: T[]
  applyDraft: (
    updater: (current: BusinessEventSource) => BusinessEventSource
  ) => void
  updater: (source: BusinessEventSource, item: T) => BusinessEventSource
}

export function restoreRemovedBusinessEventSourceItem<
  T extends { id?: string },
>({
  sectionLabel,
  id,
  items,
  applyDraft,
  updater,
}: RestoreRemovedBusinessEventSourceItemOptions<T>) {
  const removedItem = items.find((item) => item.id === id)
  if (!removedItem) {
    toast.error(`${sectionLabel}恢复失败，未找到已删除项`)
    return
  }

  applyDraft((prev) => updater(prev, removedItem))
  toast.success(`${sectionLabel}已恢复到当前未保存变更`)
}

interface SaveAllBusinessEventSourceOptions {
  draft: BusinessEventSource
  validationErrors: string[]
  setSavingAll: Dispatch<SetStateAction<boolean>>
  setCommittedSourceState: (nextSource: BusinessEventSource) => void
  setDraft: Dispatch<SetStateAction<BusinessEventSource>>
  setUndoPatches: Dispatch<SetStateAction<UndoPatchState>>
  createUndoPatchState: () => UndoPatchState
  committedSourceRef: { current: BusinessEventSource }
  onUpdate: (
    id: string,
    updates: Partial<BusinessEventSource>
  ) => Promise<BusinessEventSource | undefined>
}

export async function saveAllBusinessEventSource({
  draft,
  validationErrors,
  setSavingAll,
  setCommittedSourceState,
  setDraft,
  setUndoPatches,
  createUndoPatchState,
  committedSourceRef,
  onUpdate,
}: SaveAllBusinessEventSourceOptions) {
  if (validationErrors.length > 0) {
    toast.error(validationErrors[0])
    return
  }

  const previousCommitted = committedSourceRef.current
  const optimisticCommitted = cloneBusinessEventSource(draft)
  setSavingAll(true)
  setCommittedSourceState(optimisticCommitted)

  const saved = await onUpdate(draft.id, draft)
  setSavingAll(false)

  if (saved) {
    const normalizedSaved = cloneBusinessEventSource(saved)
    setCommittedSourceState(normalizedSaved)
    setDraft(normalizedSaved)
    setUndoPatches(createUndoPatchState())
    toast.success('业务事件源已保存')
    return
  }

  setCommittedSourceState(previousCommitted)
}

interface SaveBusinessEventSourceSectionOptions {
  section: BusinessEventSourceSection
  draft: BusinessEventSource
  validationBySection: Record<BusinessEventSourceSection, string[]>
  setSavingSections: Dispatch<SetStateAction<SavingState>>
  setCommittedSourceState: (nextSource: BusinessEventSource) => void
  setUndoPatches: Dispatch<SetStateAction<UndoPatchState>>
  setDraft: Dispatch<SetStateAction<BusinessEventSource>>
  committedSourceRef: { current: BusinessEventSource }
  onUpdate: (
    id: string,
    updates: Partial<BusinessEventSource>
  ) => Promise<BusinessEventSource | undefined>
  mergeIncomingDraft: (
    optimisticCommitted: BusinessEventSource,
    normalizedSaved: BusinessEventSource,
    currentDraft: BusinessEventSource
  ) => BusinessEventSource
}

export async function saveBusinessEventSourceSection({
  section,
  draft,
  validationBySection,
  setSavingSections,
  setCommittedSourceState,
  setUndoPatches,
  setDraft,
  committedSourceRef,
  onUpdate,
  mergeIncomingDraft,
}: SaveBusinessEventSourceSectionOptions) {
  if (validationBySection[section].length > 0) {
    toast.error(validationBySection[section][0])
    return undefined
  }

  const previousCommitted = committedSourceRef.current
  const patch = buildBusinessEventSourceSectionPatch(
    previousCommitted,
    draft,
    section
  )
  const optimisticCommitted = cloneBusinessEventSource(
    applyBusinessEventSourceSectionPatch(previousCommitted, patch)
  )

  setSavingSections((prev) => ({ ...prev, [section]: true }))
  setCommittedSourceState(optimisticCommitted)
  setUndoPatches((prev) => ({
    ...prev,
    [section]: extractBusinessEventSourceSectionPatch(
      previousCommitted,
      section
    ),
  }))

  const saved = await onUpdate(draft.id, patch)
  setSavingSections((prev) => ({ ...prev, [section]: false }))

  if (saved) {
    const normalizedSaved = cloneBusinessEventSource(saved)
    setCommittedSourceState(normalizedSaved)
    setDraft((currentDraft) =>
      mergeIncomingDraft(optimisticCommitted, normalizedSaved, currentDraft)
    )
    toast.success('分区已保存')
    return normalizedSaved
  }

  setCommittedSourceState(previousCommitted)
  setUndoPatches((prev) => ({ ...prev, [section]: null }))
  return undefined
}

interface UndoBusinessEventSourceSectionOptions {
  section: BusinessEventSourceSection
  draft: BusinessEventSource
  undoPatches: UndoPatchState
  setUndoingSections: Dispatch<SetStateAction<SavingState>>
  setDraft: Dispatch<SetStateAction<BusinessEventSource>>
  setCommittedSourceState: (nextSource: BusinessEventSource) => void
  setUndoPatches: Dispatch<SetStateAction<UndoPatchState>>
  committedSourceRef: { current: BusinessEventSource }
  onUpdate: (
    id: string,
    updates: Partial<BusinessEventSource>
  ) => Promise<BusinessEventSource | undefined>
  mergeIncomingDraft: (
    optimisticCommitted: BusinessEventSource,
    normalizedSaved: BusinessEventSource,
    currentDraft: BusinessEventSource
  ) => BusinessEventSource
}

export async function undoBusinessEventSourceSection({
  section,
  draft,
  undoPatches,
  setUndoingSections,
  setDraft,
  setCommittedSourceState,
  setUndoPatches,
  committedSourceRef,
  onUpdate,
  mergeIncomingDraft,
}: UndoBusinessEventSourceSectionOptions) {
  const undoPatch = undoPatches[section]
  if (!undoPatch) return

  const previousCommitted = committedSourceRef.current
  const previousDraft = cloneBusinessEventSource(draft)
  const nextDraft = cloneBusinessEventSource(
    applyBusinessEventSourceSectionPatch(previousDraft, undoPatch)
  )
  const optimisticCommitted = cloneBusinessEventSource(
    applyBusinessEventSourceSectionPatch(previousCommitted, undoPatch)
  )

  setUndoingSections((prev) => ({ ...prev, [section]: true }))
  setDraft(nextDraft)
  setCommittedSourceState(optimisticCommitted)

  const saved = await onUpdate(draft.id, undoPatch)
  setUndoingSections((prev) => ({ ...prev, [section]: false }))

  if (saved) {
    const normalizedSaved = cloneBusinessEventSource(saved)
    setCommittedSourceState(normalizedSaved)
    setDraft((currentDraft) =>
      mergeIncomingDraft(optimisticCommitted, normalizedSaved, currentDraft)
    )
    setUndoPatches((prev) => ({ ...prev, [section]: null }))
    toast.success('已撤销最近一次保存')
    return
  }

  setCommittedSourceState(previousCommitted)
  setDraft(previousDraft)
}
