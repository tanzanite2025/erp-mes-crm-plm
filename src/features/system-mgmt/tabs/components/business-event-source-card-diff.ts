import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'

export type BusinessEventSourceSection =
  | 'general'
  | 'actions'
  | 'statuses'
  | 'fields'
  | 'dynamicResolvers'

export type BusinessEventSourceItemChangeKind =
  | 'added'
  | 'updated'
  | 'removed'
  | 'reordered'

export interface BusinessEventSourceRemovedItemSummary {
  id: string
  code: string
  label: string
  meta: string
}

export interface BusinessEventSourceChangedItemSummary extends BusinessEventSourceRemovedItemSummary {
  changeType: BusinessEventSourceItemChangeKind
}

export interface BusinessEventSourceItemSectionDiff {
  dirty: boolean
  addedIds: Set<string>
  updatedIds: Set<string>
  reorderedIds: Set<string>
  removedIds: Set<string>
  totalChanges: number
}

export interface BusinessEventSourceGeneralDiff {
  dirty: boolean
  changedFields: string[]
  totalChanges: number
}

export interface BusinessEventSourceDiffResult {
  anyDirty: boolean
  dirtySectionCount: number
  general: BusinessEventSourceGeneralDiff
  actions: BusinessEventSourceItemSectionDiff
  statuses: BusinessEventSourceItemSectionDiff
  fields: BusinessEventSourceItemSectionDiff
  dynamicResolvers: BusinessEventSourceItemSectionDiff
}

export type BusinessEventSourceSectionPatch = Partial<BusinessEventSource>

type ConfigItem = {
  id?: string
  order?: number
}

const GENERAL_FIELD_LABELS: Record<string, string> = {
  name: '名称',
  description: '描述',
  code: '编码',
  module: '模块',
  entity: '兼容实体',
  enabled: '启用状态',
  defaultActionUrlTemplate: '默认跳转',
}

function stripConfigItemMeta<T extends ConfigItem>(item: T) {
  const { id, order, ...rest } = item
  return rest
}

function compareConfigItems<T extends ConfigItem>(
  previousItems: T[],
  nextItems: T[]
): BusinessEventSourceItemSectionDiff {
  const previousMap = new Map(
    previousItems.map((item) => [item.id ?? '', item] as const)
  )
  const nextMap = new Map(
    nextItems.map((item) => [item.id ?? '', item] as const)
  )

  const addedIds = new Set<string>()
  const updatedIds = new Set<string>()
  const reorderedIds = new Set<string>()
  const removedIds = new Set<string>()

  for (const [id, nextItem] of nextMap) {
    if (!id) continue
    const previousItem = previousMap.get(id)
    if (!previousItem) {
      addedIds.add(id)
      continue
    }

    if (
      JSON.stringify(stripConfigItemMeta(previousItem)) !==
      JSON.stringify(stripConfigItemMeta(nextItem))
    ) {
      updatedIds.add(id)
    }

    if ((previousItem.order ?? 0) !== (nextItem.order ?? 0)) {
      reorderedIds.add(id)
    }
  }

  for (const id of previousMap.keys()) {
    if (id && !nextMap.has(id)) {
      removedIds.add(id)
    }
  }

  const totalChanges =
    addedIds.size + updatedIds.size + reorderedIds.size + removedIds.size

  return {
    dirty: totalChanges > 0,
    addedIds,
    updatedIds,
    reorderedIds,
    removedIds,
    totalChanges,
  }
}

function compareGeneralSection(
  previousSource: BusinessEventSource,
  nextSource: BusinessEventSource
): BusinessEventSourceGeneralDiff {
  const changedFields: string[] = []

  if (previousSource.name !== nextSource.name) changedFields.push('name')
  if ((previousSource.description ?? '') !== (nextSource.description ?? '')) {
    changedFields.push('description')
  }
  if (previousSource.code !== nextSource.code) changedFields.push('code')
  if (previousSource.module !== nextSource.module) changedFields.push('module')
  if (previousSource.entity !== nextSource.entity) changedFields.push('entity')
  if (previousSource.enabled !== nextSource.enabled)
    changedFields.push('enabled')
  if (
    (previousSource.config.defaultActionUrlTemplate ?? '') !==
    (nextSource.config.defaultActionUrlTemplate ?? '')
  ) {
    changedFields.push('defaultActionUrlTemplate')
  }

  return {
    dirty: changedFields.length > 0,
    changedFields,
    totalChanges: changedFields.length,
  }
}

export function getBusinessEventSourceDiff(
  previousSource: BusinessEventSource,
  nextSource: BusinessEventSource
): BusinessEventSourceDiffResult {
  const general = compareGeneralSection(previousSource, nextSource)
  const actions = compareConfigItems(
    previousSource.config.actions,
    nextSource.config.actions
  )
  const statuses = compareConfigItems(
    previousSource.config.statuses,
    nextSource.config.statuses
  )
  const fields = compareConfigItems(
    previousSource.config.fields,
    nextSource.config.fields
  )
  const dynamicResolvers = compareConfigItems(
    previousSource.config.dynamicResolvers,
    nextSource.config.dynamicResolvers
  )

  const dirtySectionCount = [
    general.dirty,
    actions.dirty,
    statuses.dirty,
    fields.dirty,
    dynamicResolvers.dirty,
  ].filter(Boolean).length

  return {
    anyDirty: dirtySectionCount > 0,
    dirtySectionCount,
    general,
    actions,
    statuses,
    fields,
    dynamicResolvers,
  }
}

export function getBusinessEventSourceItemChangeKind(
  diff: BusinessEventSourceItemSectionDiff,
  id?: string
): BusinessEventSourceItemChangeKind | null {
  if (!id) return null
  if (diff.addedIds.has(id)) return 'added'
  if (diff.updatedIds.has(id)) return 'updated'
  if (diff.reorderedIds.has(id)) return 'reordered'
  return null
}

export function getBusinessEventSourceGeneralChangedFields(
  diff: BusinessEventSourceGeneralDiff
) {
  return diff.changedFields.map((field) => ({
    key: field,
    label: GENERAL_FIELD_LABELS[field] ?? field,
  }))
}

export function getBusinessEventSourceSectionDiffSummary(
  diff: BusinessEventSourceItemSectionDiff
) {
  const parts: string[] = []
  if (diff.addedIds.size > 0) parts.push(`新增 ${diff.addedIds.size}`)
  if (diff.updatedIds.size > 0) parts.push(`修改 ${diff.updatedIds.size}`)
  if (diff.removedIds.size > 0) parts.push(`删除 ${diff.removedIds.size}`)
  if (diff.reorderedIds.size > 0) parts.push(`排序 ${diff.reorderedIds.size}`)
  return parts.join(' / ')
}

export function getBusinessEventSourceGeneralDiffSummary(
  diff: BusinessEventSourceGeneralDiff
) {
  return diff.changedFields
    .map((field) => GENERAL_FIELD_LABELS[field] ?? field)
    .join(' / ')
}

export function buildBusinessEventSourceSectionPatch(
  previousSource: BusinessEventSource,
  nextSource: BusinessEventSource,
  section: BusinessEventSourceSection
): BusinessEventSourceSectionPatch {
  switch (section) {
    case 'general':
      return {
        name: nextSource.name,
        description: nextSource.description,
        code: nextSource.code,
        module: nextSource.module,
        entity: nextSource.entity,
        enabled: nextSource.enabled,
        config: {
          ...previousSource.config,
          defaultActionUrlTemplate: nextSource.config.defaultActionUrlTemplate,
        },
      }
    case 'actions':
      return {
        config: {
          ...previousSource.config,
          actions: nextSource.config.actions,
        },
      }
    case 'statuses':
      return {
        config: {
          ...previousSource.config,
          statuses: nextSource.config.statuses,
        },
      }
    case 'fields':
      return {
        config: {
          ...previousSource.config,
          fields: nextSource.config.fields,
        },
      }
    case 'dynamicResolvers':
      return {
        config: {
          ...previousSource.config,
          dynamicResolvers: nextSource.config.dynamicResolvers,
        },
      }
  }
}

export function extractBusinessEventSourceSectionPatch(
  source: BusinessEventSource,
  section: BusinessEventSourceSection
): BusinessEventSourceSectionPatch {
  return buildBusinessEventSourceSectionPatch(source, source, section)
}

export function applyBusinessEventSourceSectionPatch(
  source: BusinessEventSource,
  patch: BusinessEventSourceSectionPatch
): BusinessEventSource {
  return {
    ...source,
    ...patch,
    config: patch.config
      ? {
          ...source.config,
          ...patch.config,
        }
      : source.config,
  }
}

export function getRemovedBusinessEventSourceItems<T extends { id?: string }>(
  previousItems: T[],
  diff: BusinessEventSourceItemSectionDiff,
  mapItem: (item: T) => BusinessEventSourceRemovedItemSummary
) {
  return previousItems
    .filter((item) => item.id && diff.removedIds.has(item.id))
    .map(mapItem)
}

export function getChangedBusinessEventSourceItems<T extends { id?: string }>(
  previousItems: T[],
  nextItems: T[],
  diff: BusinessEventSourceItemSectionDiff,
  mapItem: (item: T) => BusinessEventSourceRemovedItemSummary
) {
  const changedItems: BusinessEventSourceChangedItemSummary[] = []

  nextItems.forEach((item) => {
    const changeType = getBusinessEventSourceItemChangeKind(diff, item.id)
    if (!changeType) return
    changedItems.push({
      ...mapItem(item),
      changeType,
    })
  })

  previousItems.forEach((item) => {
    if (!item.id || !diff.removedIds.has(item.id)) return
    changedItems.push({
      ...mapItem(item),
      changeType: 'removed',
    })
  })

  return changedItems
}
