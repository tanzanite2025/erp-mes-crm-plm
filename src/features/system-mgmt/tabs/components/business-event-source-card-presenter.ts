import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'
import {
  getBusinessEventFieldSummary,
  getBusinessEventStatusSummary,
} from './business-event-source-card-model'
import {
  getBusinessEventSourceDiff,
  getBusinessEventSourceGeneralChangedFields,
  getBusinessEventSourceGeneralDiffSummary,
  getBusinessEventSourceSectionDiffSummary,
  getChangedBusinessEventSourceItems,
  getRemovedBusinessEventSourceItems,
  type BusinessEventSourceRemovedItemSummary,
  type BusinessEventSourceSection,
} from './business-event-source-card-diff'
import { type BusinessEventSourceChangeOverviewSection } from './business-event-source-card-change-panel'
import {
  validateBusinessEventSource,
  validateBusinessEventSourceSection,
} from './business-event-source-card-utils'

function collectConfigItemIds(items: Array<{ id?: string }>) {
  return new Set(items.flatMap((item) => (item.id ? [item.id] : [])))
}

export interface BusinessEventSourceCardPresentation {
  statusSummary: string
  fieldSummary: string
  validationErrors: string[]
  validationBySection: Record<BusinessEventSourceSection, string[]>
  diff: ReturnType<typeof getBusinessEventSourceDiff>
  isIdentityLocked: boolean
  persistedActionIds: Set<string>
  persistedStatusIds: Set<string>
  persistedFieldIds: Set<string>
  persistedResolverIds: Set<string>
  removedActionItems: BusinessEventSourceRemovedItemSummary[]
  removedStatusItems: BusinessEventSourceRemovedItemSummary[]
  removedFieldItems: BusinessEventSourceRemovedItemSummary[]
  removedResolverItems: BusinessEventSourceRemovedItemSummary[]
  changeOverviewSections: BusinessEventSourceChangeOverviewSection[]
}

interface BusinessEventSourceCardPresentationOptions {
  committedSource: BusinessEventSource
  draft: BusinessEventSource
  onOpenStatuses?: () => void
  onOpenFields?: () => void
}

export function buildBusinessEventSourceCardPresentation({
  committedSource,
  draft,
  onOpenStatuses,
  onOpenFields,
}: BusinessEventSourceCardPresentationOptions): BusinessEventSourceCardPresentation {
  const statusSummary = getBusinessEventStatusSummary(draft)
  const fieldSummary = getBusinessEventFieldSummary(draft)
  const validationErrors = validateBusinessEventSource(draft)
  const validationBySection = {
    general: validateBusinessEventSourceSection(draft, 'general'),
    actions: validateBusinessEventSourceSection(draft, 'actions'),
    statuses: validateBusinessEventSourceSection(draft, 'statuses'),
    fields: validateBusinessEventSourceSection(draft, 'fields'),
    dynamicResolvers: validateBusinessEventSourceSection(
      draft,
      'dynamicResolvers'
    ),
  } satisfies Record<BusinessEventSourceSection, string[]>
  const diff = getBusinessEventSourceDiff(committedSource, draft)
  const isIdentityLocked = Boolean(committedSource.id)
  const persistedActionIds = collectConfigItemIds(committedSource.config.actions)
  const persistedStatusIds = collectConfigItemIds(
    committedSource.config.statuses
  )
  const persistedFieldIds = collectConfigItemIds(committedSource.config.fields)
  const persistedResolverIds = collectConfigItemIds(
    committedSource.config.dynamicResolvers
  )

  const removedActionItems = getRemovedBusinessEventSourceItems(
    committedSource.config.actions,
    diff.actions,
    (item) => ({
      id: item.id ?? '',
      code: item.code,
      label: item.name,
      meta: item.kind,
    })
  )
  const removedStatusItems = getRemovedBusinessEventSourceItems(
    committedSource.config.statuses,
    diff.statuses,
    (item) => ({
      id: item.id ?? '',
      code: item.code,
      label: item.label,
      meta: item.phase,
    })
  )
  const removedFieldItems = getRemovedBusinessEventSourceItems(
    committedSource.config.fields,
    diff.fields,
    (item) => ({
      id: item.id ?? '',
      code: item.key,
      label: item.label,
      meta: item.type,
    })
  )
  const removedResolverItems = getRemovedBusinessEventSourceItems(
    committedSource.config.dynamicResolvers,
    diff.dynamicResolvers,
    (item) => ({
      id: item.id ?? '',
      code: item.code,
      label: item.label,
      meta: item.type,
    })
  )

  const changeOverviewSections: BusinessEventSourceChangeOverviewSection[] = []

  if (diff.general.dirty) {
    changeOverviewSections.push({
      section: 'general',
      title: '基础配置',
      summary: getBusinessEventSourceGeneralDiffSummary(diff.general),
      items: getBusinessEventSourceGeneralChangedFields(diff.general).map(
        (field) => ({
          id: `general-${field.key}`,
          code: field.key,
          label: field.label,
          meta: '基础配置',
          changeType: 'updated' as const,
        })
      ),
    })
  }

  if (diff.actions.dirty) {
    changeOverviewSections.push({
      section: 'actions',
      title: '动作',
      summary: getBusinessEventSourceSectionDiffSummary(diff.actions),
      items: getChangedBusinessEventSourceItems(
        committedSource.config.actions,
        draft.config.actions,
        diff.actions,
        (item) => ({
          id: item.id ?? '',
          code: item.code,
          label: item.name,
          meta: item.kind,
        })
      ),
    })
  }

  if (diff.statuses.dirty) {
    changeOverviewSections.push({
      section: 'statuses',
      title: '状态',
      summary: getBusinessEventSourceSectionDiffSummary(diff.statuses),
      items: getChangedBusinessEventSourceItems(
        committedSource.config.statuses,
        draft.config.statuses,
        diff.statuses,
        (item) => ({
          id: item.id ?? '',
          code: item.code,
          label: item.label,
          meta: item.phase,
        })
      ),
      onOpen: onOpenStatuses,
      actionLabel: onOpenStatuses ? '展开' : undefined,
    })
  }

  if (diff.fields.dirty) {
    changeOverviewSections.push({
      section: 'fields',
      title: '字段',
      summary: getBusinessEventSourceSectionDiffSummary(diff.fields),
      items: getChangedBusinessEventSourceItems(
        committedSource.config.fields,
        draft.config.fields,
        diff.fields,
        (item) => ({
          id: item.id ?? '',
          code: item.key,
          label: item.label,
          meta: item.type,
        })
      ),
      onOpen: onOpenFields,
      actionLabel: onOpenFields ? '展开' : undefined,
    })
  }

  if (diff.dynamicResolvers.dirty) {
    changeOverviewSections.push({
      section: 'dynamicResolvers',
      title: '动态接收人',
      summary: getBusinessEventSourceSectionDiffSummary(diff.dynamicResolvers),
      items: getChangedBusinessEventSourceItems(
        committedSource.config.dynamicResolvers,
        draft.config.dynamicResolvers,
        diff.dynamicResolvers,
        (item) => ({
          id: item.id ?? '',
          code: item.code,
          label: item.label,
          meta: item.type,
        })
      ),
    })
  }

  return {
    statusSummary,
    fieldSummary,
    validationErrors,
    validationBySection,
    diff,
    isIdentityLocked,
    persistedActionIds,
    persistedStatusIds,
    persistedFieldIds,
    persistedResolverIds,
    removedActionItems,
    removedStatusItems,
    removedFieldItems,
    removedResolverItems,
    changeOverviewSections,
  }
}
