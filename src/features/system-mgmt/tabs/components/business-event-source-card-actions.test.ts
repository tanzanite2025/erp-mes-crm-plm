import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DEFAULT_SALES_ORDER_EVENT_SOURCE } from '../../workflow-core/data/business-event-source-templates/sales-order'
import { normalizeBusinessEventSource } from '../../workflow-core/data/business-event-source-normalizer'
import {
  buildBusinessEventSourceSectionPatch,
  extractBusinessEventSourceSectionPatch,
} from './business-event-source-card-diff'
import {
  type UndoPatchState,
  restoreRemovedBusinessEventSourceItem,
  saveAllBusinessEventSource,
  saveBusinessEventSourceSection,
  undoBusinessEventSourceSection,
} from './business-event-source-card-actions'
import { cloneBusinessEventSource } from './business-event-source-card-utils'

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

function createSource() {
  return normalizeBusinessEventSource({
    ...DEFAULT_SALES_ORDER_EVENT_SOURCE,
    id: 'source-1',
  })
}

function createState<T>(initialValue: T) {
  let currentValue = initialValue
  return {
    get value() {
      return currentValue
    },
    set(next: T | ((current: T) => T)) {
      currentValue =
        typeof next === 'function'
          ? (next as (current: T) => T)(currentValue)
          : next
    },
  }
}

describe('business-event-source-card-actions', () => {
  beforeEach(() => {
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
  })

  it('restores a removed item back into the draft', () => {
    const sourceState = createState(createSource())
    const removedAction = sourceState.value.config.actions[0]
    sourceState.set((current) => ({
      ...current,
      config: {
        ...current.config,
        actions: current.config.actions.slice(1),
      },
    }))

    restoreRemovedBusinessEventSourceItem({
      sectionLabel: '动作',
      id: removedAction.id ?? '',
      items: [removedAction],
      applyDraft: sourceState.set,
      updater: (source, item) => ({
        ...source,
        config: {
          ...source.config,
          actions: [item, ...source.config.actions],
        },
      }),
    })

    expect(sourceState.value.config.actions[0]?.id).toBe(removedAction.id)
    expect(toastSuccessMock).toHaveBeenCalledWith('动作已恢复到当前未保存变更')
  })

  it('shows an error when the removed item can no longer be found', () => {
    const sourceState = createState(createSource())

    restoreRemovedBusinessEventSourceItem({
      sectionLabel: '字段',
      id: 'missing-field',
      items: [],
      applyDraft: sourceState.set,
      updater: (source) => source,
    })

    expect(toastErrorMock).toHaveBeenCalledWith('字段恢复失败，未找到已删除项')
  })

  it('blocks saveAll when validation errors exist', async () => {
    const draft = createSource()
    const savingAllState = createState(false)
    const draftState = createState(draft)
    const undoState = createState<UndoPatchState>({
      general: null,
      actions: null,
      statuses: null,
      fields: null,
      dynamicResolvers: null,
    })
    let committed = draft
    const onUpdate = vi.fn()

    await saveAllBusinessEventSource({
      draft,
      validationErrors: ['事件源名称不能为空'],
      setSavingAll: savingAllState.set,
      setCommittedSourceState: (next) => {
        committed = next
      },
      setDraft: draftState.set,
      setUndoPatches: undoState.set,
      createUndoPatchState: () => undoState.value,
      committedSourceRef: { current: committed },
      onUpdate,
    })

    expect(onUpdate).not.toHaveBeenCalled()
    expect(savingAllState.value).toBe(false)
    expect(toastErrorMock).toHaveBeenCalledWith('事件源名称不能为空')
  })

  it('saves a single section and persists the merged draft', async () => {
    const committedSource = createSource()
    const draft = cloneBusinessEventSource(committedSource)
    draft.name = '销售订单（新）'

    const savingSectionsState = createState({
      general: false,
      actions: false,
      statuses: false,
      fields: false,
      dynamicResolvers: false,
    })
    const undoState = createState<UndoPatchState>({
      general: null,
      actions: null,
      statuses: null,
      fields: null,
      dynamicResolvers: null,
    })
    const draftState = createState(draft)
    let committedState = committedSource
    const onUpdate = vi.fn(async (_id: string, patch: Partial<typeof draft>) => ({
      ...committedSource,
      ...patch,
      config: patch.config
        ? {
            ...committedSource.config,
            ...patch.config,
          }
        : committedSource.config,
    }))

    await saveBusinessEventSourceSection({
      section: 'general',
      draft,
      validationBySection: {
        general: [],
        actions: [],
        statuses: [],
        fields: [],
        dynamicResolvers: [],
      },
      setSavingSections: savingSectionsState.set,
      setCommittedSourceState: (next) => {
        committedState = next
      },
      setUndoPatches: undoState.set,
      setDraft: draftState.set,
      committedSourceRef: { current: committedSource },
      onUpdate,
      mergeIncomingDraft: (_optimisticCommitted, normalizedSaved) =>
        normalizedSaved,
    })

    expect(onUpdate).toHaveBeenCalledWith(
      'source-1',
      expect.objectContaining({
        name: '销售订单（新）',
      })
    )
    expect(savingSectionsState.value.general).toBe(false)
    expect(draftState.value.name).toBe('销售订单（新）')
    expect(committedState.name).toBe('销售订单（新）')
    expect(undoState.value.general).toEqual(
      extractBusinessEventSourceSectionPatch(committedSource, 'general')
    )
    expect(toastSuccessMock).toHaveBeenCalledWith('分区已保存')
  })

  it('undoes a saved section with the stored undo patch', async () => {
    const original = createSource()
    const saved = cloneBusinessEventSource(original)
    saved.name = '销售订单（已保存）'

    const undoingSectionsState = createState({
      general: false,
      actions: false,
      statuses: false,
      fields: false,
      dynamicResolvers: false,
    })
    const draftState = createState(saved)
    const undoState = createState<UndoPatchState>({
      general: buildBusinessEventSourceSectionPatch(original, original, 'general'),
      actions: null,
      statuses: null,
      fields: null,
      dynamicResolvers: null,
    })
    let committedState = saved
    const onUpdate = vi.fn(async () => original)

    await undoBusinessEventSourceSection({
      section: 'general',
      draft: saved,
      undoPatches: undoState.value,
      setUndoingSections: undoingSectionsState.set,
      setDraft: draftState.set,
      setCommittedSourceState: (next) => {
        committedState = next
      },
      setUndoPatches: undoState.set,
      committedSourceRef: { current: saved },
      onUpdate,
      mergeIncomingDraft: (_optimisticCommitted, normalizedSaved) =>
        normalizedSaved,
    })

    expect(onUpdate).toHaveBeenCalledWith(
      'source-1',
      buildBusinessEventSourceSectionPatch(original, original, 'general')
    )
    expect(undoingSectionsState.value.general).toBe(false)
    expect(draftState.value.name).toBe(original.name)
    expect(committedState.name).toBe(original.name)
    expect(undoState.value.general).toBeNull()
    expect(toastSuccessMock).toHaveBeenCalledWith('已撤销最近一次保存')
  })
})
