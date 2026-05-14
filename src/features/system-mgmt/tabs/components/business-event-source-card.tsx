import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  type BusinessEventSource,
} from '../../workflow-core/data/business-event-source-schema'
import { getBusinessEventSourceRuntimeCoverage } from '../../workflow-core/data/business-event-source-runtime-coverage'
import {
  restoreRemovedBusinessEventSourceItem,
  saveAllBusinessEventSource,
  saveBusinessEventSourceSection,
  undoBusinessEventSourceSection,
} from './business-event-source-card-actions'
import {
  BusinessEventSourceChangePanel,
} from './business-event-source-card-change-panel'
import {
  BusinessEventSourceEditorOverlay,
  type BusinessEventSourceEditorMode,
} from './business-event-source-card-drawer-panel'
import { BusinessEventSourceCardHeader } from './business-event-source-card-header'
import { BusinessEventSourceDeleteDialog } from './business-event-source-delete-dialog'
import { buildBusinessEventSourceCardPresentation } from './business-event-source-card-presenter'
import { BusinessEventSourceBaseSection } from './business-event-source-base-section'
import { BusinessEventSourceFieldSection } from './business-event-source-field-section'
import {
  getBusinessEventSourceGeneralDiffSummary,
  getBusinessEventSourceItemChangeKind,
  getBusinessEventSourceSectionDiffSummary,
  type BusinessEventSourceItemChangeKind,
  type BusinessEventSourceSection,
  type BusinessEventSourceSectionPatch,
} from './business-event-source-card-diff'
import { BusinessEventSourceActionSection } from './business-event-source-action-section'
import { BusinessEventSourceStatusSection } from './business-event-source-status-section'
import {
  appendBusinessDynamicResolver,
  appendBusinessEventAction,
  appendBusinessEventField,
  appendBusinessStatus,
  moveBusinessStatus,
  removeBusinessDynamicResolverAt,
  removeBusinessEventActionAt,
  removeBusinessEventFieldAt,
  removeBusinessStatusAt,
  restoreBusinessDynamicResolver,
  restoreBusinessEventAction,
  restoreBusinessEventField,
  restoreBusinessStatus,
  updateBusinessDynamicResolverAt,
  updateBusinessEventActionAt,
  updateBusinessEventFieldAt,
  updateBusinessEventSourceConfig,
  updateBusinessEventSourceDraft,
  updateBusinessStatusAt,
} from './business-event-source-card-model'
import { BusinessEventSourceResolverSection } from './business-event-source-resolver-section'
import {
  createBusinessEventSourceSavingState,
  createBusinessEventSourceUndoPatchState,
  mergeDirtySectionsIntoIncomingSource,
  type BusinessEventSourceCardSavingState,
} from './business-event-source-card-state'
import {
  cloneBusinessEventSource,
} from './business-event-source-card-utils'
import { type NotificationRule } from '../../workflow-core/data/notification-rule-schema'
import { buildBusinessEventStatusReferenceMap } from './business-event-source-status-references'
import {
  analyzeBusinessEventStatusRenameBatch,
  analyzeBusinessEventStatusRenamePlans,
  collectBusinessEventStatusRenameDrafts,
} from './business-event-source-status-safe-rename'
import { saveBusinessEventSourceStatuses } from './business-event-source-status-save-action'

interface BusinessEventSourceCardProps {
  source: BusinessEventSource
  expanded: boolean
  highlighted?: boolean
  rules: NotificationRule[]
  statusReferencesLoaded: boolean
  onRulesReplace: Dispatch<SetStateAction<NotificationRule[]>>
  onExpandedChange: (expanded: boolean) => void
  onUpdate: (
    id: string,
    updates: Partial<BusinessEventSource>
  ) => Promise<BusinessEventSource | undefined>
  onSourceReplace: (source: BusinessEventSource) => void
  onDelete: (id: string) => Promise<void>
  onDuplicate: (source: BusinessEventSource) => Promise<void>
  canDelete: boolean
}

type SavingState = BusinessEventSourceCardSavingState
type UndoPatchState = Record<
  BusinessEventSourceSection,
  BusinessEventSourceSectionPatch | null
>
type FocusedChangeTarget = {
  section: BusinessEventSourceSection | 'general'
  itemId?: string
  changeType?: BusinessEventSourceItemChangeKind
} | null

export function BusinessEventSourceCard({
  source,
  expanded,
  highlighted = false,
  rules,
  statusReferencesLoaded,
  onRulesReplace,
  onExpandedChange,
  onUpdate,
  onSourceReplace,
  onDelete,
  onDuplicate,
  canDelete,
}: BusinessEventSourceCardProps) {
  const runtimeCoverage = useMemo(
    () => getBusinessEventSourceRuntimeCoverage(source.code),
    [source.code]
  )
  const initialCommitted = cloneBusinessEventSource(source)
  const [draft, setDraft] = useState<BusinessEventSource>(
    () => initialCommitted
  )
  const [committedSource, setCommittedSource] =
    useState<BusinessEventSource>(initialCommitted)
  const [savingAll, setSavingAll] = useState(false)
  const [savingSections, setSavingSections] =
    useState<SavingState>(createBusinessEventSourceSavingState)
  const [undoingSections, setUndoingSections] =
    useState<SavingState>(createBusinessEventSourceSavingState)
  const [undoPatches, setUndoPatches] =
    useState<UndoPatchState>(createBusinessEventSourceUndoPatchState)
  const [editorMode, setEditorMode] =
    useState<BusinessEventSourceEditorMode>(null)
  const [focusedTarget, setFocusedTarget] = useState<FocusedChangeTarget>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const committedSourceRef = useRef<BusinessEventSource>(initialCommitted)
  const generalSectionRef = useRef<HTMLElement | null>(null)
  const actionsSectionRef = useRef<HTMLDivElement | null>(null)
  const statusesSectionRef = useRef<HTMLDivElement | null>(null)
  const fieldsSectionRef = useRef<HTMLDivElement | null>(null)
  const dynamicResolversSectionRef = useRef<HTMLDivElement | null>(null)
  const statusReferenceMap = useMemo(
    () => buildBusinessEventStatusReferenceMap(committedSource, rules),
    [committedSource, rules]
  )
  const committedStatusCodeMap = useMemo(
    () =>
      new Map(
        committedSource.config.statuses.flatMap((status) =>
          status.id ? ([[status.id, status.code]] as const) : []
        )
      ),
    [committedSource]
  )
  const statusRenamePlans = useMemo(
    () =>
      analyzeBusinessEventStatusRenamePlans({
        sourceCode: committedSource.code,
        rules,
        renameDrafts: collectBusinessEventStatusRenameDrafts(
          committedSource,
          draft
        ),
      }),
    [committedSource, draft, rules]
  )
  const statusRenameBatchAnalysis = useMemo(
    () =>
      analyzeBusinessEventStatusRenameBatch({
        sourceCode: committedSource.code,
        rules,
        renamePlans: statusRenamePlans,
      }),
    [committedSource.code, rules, statusRenamePlans]
  )

  const referencingRules = useMemo(
    () =>
      rules.filter(
        (rule) => rule.sourceCode === committedSource.code
      ),
    [rules, committedSource.code]
  )

  const setCommittedSourceState = (nextSource: BusinessEventSource) => {
    const normalized = cloneBusinessEventSource(nextSource)
    committedSourceRef.current = normalized
    setCommittedSource(normalized)
  }

  useEffect(() => {
    const normalizedIncoming = cloneBusinessEventSource(source)
    setDraft((currentDraft) =>
      mergeDirtySectionsIntoIncomingSource(
        committedSourceRef.current,
        normalizedIncoming,
        currentDraft
      )
    )
    setCommittedSourceState(normalizedIncoming)
  }, [source])

  useEffect(() => {
    if (!focusedTarget) return
    const timeoutId = window.setTimeout(() => {
      setFocusedTarget(null)
    }, 2600)
    return () => window.clearTimeout(timeoutId)
  }, [focusedTarget])

  const scrollToSection = (section: BusinessEventSourceSection | 'general') => {
    const targetMap = {
      general: generalSectionRef.current,
      actions: actionsSectionRef.current,
      statuses: statusesSectionRef.current,
      fields: fieldsSectionRef.current,
      dynamicResolvers: dynamicResolversSectionRef.current,
    }
    targetMap[section]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  const locateChangeItem = (
    section: BusinessEventSourceSection | 'general',
    itemId?: string,
    changeType?: BusinessEventSourceItemChangeKind
  ) => {
    setFocusedTarget({ section, itemId, changeType })

    if (section === 'statuses' || section === 'fields') {
      setEditorMode(section)
      window.setTimeout(() => {
        scrollToSection(section)
      }, 60)
      return
    }

    scrollToSection(section)
  }

  const {
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
  } = useMemo(
    () =>
      buildBusinessEventSourceCardPresentation({
        committedSource,
        draft,
        onOpenStatuses: () => setEditorMode('statuses'),
        onOpenFields: () => setEditorMode('fields'),
      }),
    [committedSource, draft]
  )

  const applyDraft = (
    updater: (current: BusinessEventSource) => BusinessEventSource
  ) => {
    setDraft((prev) => updater(prev))
  }

  const mergeIncomingDraft = (
    optimisticCommitted: BusinessEventSource,
    normalizedSaved: BusinessEventSource,
    currentDraft: BusinessEventSource
  ) =>
    mergeDirtySectionsIntoIncomingSource(
      optimisticCommitted,
      normalizedSaved,
      currentDraft
    )

  const restoreRemovedItem = <T extends { id?: string }>(
    sectionLabel: string,
    id: string,
    items: T[],
    updater: (source: BusinessEventSource, item: T) => BusinessEventSource
  ) => {
    restoreRemovedBusinessEventSourceItem({
      sectionLabel,
      id,
      items,
      applyDraft,
      updater,
    })
  }

  const restoreRemovedActionItem = (id: string) => {
    restoreRemovedItem(
      '动作',
      id,
      committedSourceRef.current.config.actions,
      restoreBusinessEventAction
    )
  }

  const restoreRemovedStatusItem = (id: string) => {
    restoreRemovedItem(
      '状态',
      id,
      committedSourceRef.current.config.statuses,
      restoreBusinessStatus
    )
  }

  const restoreRemovedFieldItem = (id: string) => {
    restoreRemovedItem(
      '字段',
      id,
      committedSourceRef.current.config.fields,
      restoreBusinessEventField
    )
  }

  const restoreRemovedResolverItem = (id: string) => {
    restoreRemovedItem(
      '动态接收人',
      id,
      committedSourceRef.current.config.dynamicResolvers,
      restoreBusinessDynamicResolver
    )
  }

  const saveAll = async () => {
    await saveAllBusinessEventSource({
      draft,
      validationErrors,
      setSavingAll,
      setCommittedSourceState,
      setDraft,
      setUndoPatches,
      createUndoPatchState: createBusinessEventSourceUndoPatchState,
      committedSourceRef,
      onUpdate,
    })
  }

  const saveStatusesWithSafeRename = async () => {
    return saveBusinessEventSourceStatuses({
      draft,
      committedSource,
      committedSourceRef,
      rules,
      validationBySection,
      statusRenamePlans,
      statusRenameBatchAnalysis,
      setSavingSections,
      setCommittedSourceState,
      setUndoPatches,
      setDraft,
      onRulesReplace,
      onUpdate,
      onSourceReplace,
      mergeIncomingDraft,
    })
  }

  const saveSection = async (section: BusinessEventSourceSection) => {
    if (section === 'statuses') {
      await saveStatusesWithSafeRename()
      return
    }

    await saveBusinessEventSourceSection({
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
    })
  }

  const undoSection = async (section: BusinessEventSourceSection) => {
    await undoBusinessEventSourceSection({
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
    })
  }

  return (
    <>
    <Collapsible
      open={expanded}
      onOpenChange={onExpandedChange}
      className={cn(
        'overflow-hidden rounded-3xl border border-muted/40 bg-card shadow-sm transition-all',
        highlighted && 'ring-2 ring-sky-300 ring-offset-2'
      )}
    >
      <BusinessEventSourceCardHeader
            name={draft.name}
            code={draft.code}
            runtimeCoverageLabel={runtimeCoverage.label}
            runtimeCoverageDescription={runtimeCoverage.description}
            runtimeCoverageClassName={runtimeCoverage.className}
            description={draft.description}
            enabled={draft.enabled}
            expanded={expanded}
            highlighted={highlighted}
            statusSummary={statusSummary}
            fieldSummary={fieldSummary}
            dirtySectionCount={diff.dirtySectionCount}
            hasDirtyChanges={diff.anyDirty}
            savingAll={savingAll}
            hasValidationErrors={validationErrors.length > 0}
            canDelete={canDelete}
            onExpandedChange={onExpandedChange}
            onDescriptionChange={(value) =>
              applyDraft((prev) =>
                updateBusinessEventSourceDraft(prev, {
                  description: value,
                })
              )
            }
            onEnabledChange={(enabled) =>
              applyDraft((prev) =>
                updateBusinessEventSourceDraft(prev, { enabled })
              )
            }
            onSaveAll={saveAll}
            onDuplicate={() => onDuplicate(draft)}
            onDelete={() => setDeleteDialogOpen(true)}
      />

      <CollapsibleContent className='overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'>
      {diff.anyDirty && (
        <BusinessEventSourceChangePanel
          sections={changeOverviewSections}
          onLocateItem={(section, item) =>
            locateChangeItem(section, item.id, item.changeType)
          }
        />
      )}

      {validationErrors.length > 0 && (
        <div className='mx-6 mt-4 flex gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-bold text-destructive'>
          <AlertCircle className='mt-0.5 size-4 shrink-0' />
          <div className='flex flex-col gap-1'>
            {validationErrors.slice(0, 4).map((error) => (
              <span key={error}>{error}</span>
            ))}
            {validationErrors.length > 4 && (
              <span>还有 {validationErrors.length - 4} 项需要处理</span>
            )}
          </div>
        </div>
      )}

      <Tabs defaultValue='actions' className='px-6 pb-6 pt-2'>
        <TabsList className='mb-4 h-auto w-full justify-start gap-1 rounded-2xl bg-muted/40 p-1'>
          <TabsTrigger
            value='actions'
            className='gap-2 rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-background data-[state=active]:shadow-sm'
          >
            动作
            <Badge variant='secondary' className='rounded-full px-1.5 text-[10px]'>
              {draft.config.actions.length}
            </Badge>
            {diff.actions.dirty && (
              <span className='size-1.5 rounded-full bg-amber-500' />
            )}
          </TabsTrigger>
          <TabsTrigger
            value='statuses'
            className='gap-2 rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-background data-[state=active]:shadow-sm'
          >
            状态
            <Badge variant='secondary' className='rounded-full px-1.5 text-[10px]'>
              {draft.config.statuses.length}
            </Badge>
            {diff.statuses.dirty && (
              <span className='size-1.5 rounded-full bg-amber-500' />
            )}
          </TabsTrigger>
          <TabsTrigger
            value='fields'
            className='gap-2 rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-background data-[state=active]:shadow-sm'
          >
            字段
            <Badge variant='secondary' className='rounded-full px-1.5 text-[10px]'>
              {draft.config.fields.length}
            </Badge>
            {diff.fields.dirty && (
              <span className='size-1.5 rounded-full bg-amber-500' />
            )}
          </TabsTrigger>
          <TabsTrigger
            value='resolvers'
            className='gap-2 rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-background data-[state=active]:shadow-sm'
          >
            动态接收人
            <Badge variant='secondary' className='rounded-full px-1.5 text-[10px]'>
              {draft.config.dynamicResolvers.length}
            </Badge>
            {diff.dynamicResolvers.dirty && (
              <span className='size-1.5 rounded-full bg-amber-500' />
            )}
          </TabsTrigger>
          <TabsTrigger
            value='base'
            className='ml-auto gap-2 rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-background data-[state=active]:shadow-sm'
          >
            基础配置
            {diff.general.dirty && (
              <span className='size-1.5 rounded-full bg-amber-500' />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='actions' className='mt-0'>
          <BusinessEventSourceActionSection
          actions={draft.config.actions}
          persistedActionIds={persistedActionIds}
          dirty={diff.actions.dirty}
          changeSummary={getBusinessEventSourceSectionDiffSummary(diff.actions)}
          saving={savingSections.actions}
          saveDisabled={
            savingSections.actions ||
            validationBySection.actions.length > 0 ||
            !diff.actions.dirty
          }
          undoAvailable={Boolean(undoPatches.actions)}
          undoDisabled={undoingSections.actions}
          undoing={undoingSections.actions}
          removedItems={removedActionItems}
          sectionRef={actionsSectionRef}
          alwaysOpen
          focusedItemId={
            focusedTarget?.section === 'actions' &&
            focusedTarget.changeType !== 'removed'
              ? (focusedTarget.itemId ?? null)
              : null
          }
          focusedRemovedItemId={
            focusedTarget?.section === 'actions' &&
            focusedTarget.changeType === 'removed'
              ? (focusedTarget.itemId ?? null)
              : null
          }
          forceOpenRemovedItems={
            focusedTarget?.section === 'actions' &&
            focusedTarget.changeType === 'removed'
          }
          onAdd={() => applyDraft((prev) => appendBusinessEventAction(prev))}
          onSave={() => void saveSection('actions')}
          onUndo={
            undoPatches.actions ? () => void undoSection('actions') : undefined
          }
          onRestoreRemovedItem={restoreRemovedActionItem}
          getChangeType={(id) =>
            getBusinessEventSourceItemChangeKind(diff.actions, id)
          }
          onCodeChange={(index, value) =>
            applyDraft((prev) =>
              updateBusinessEventActionAt(prev, index, {
                code: value,
              })
            )
          }
          onNameChange={(index, value) =>
            applyDraft((prev) =>
              updateBusinessEventActionAt(prev, index, {
                name: value,
              })
            )
          }
          onKindChange={(index, value) =>
            applyDraft((prev) =>
              updateBusinessEventActionAt(prev, index, {
                kind: value,
              })
            )
          }
          onDelete={(index) =>
            applyDraft((prev) => removeBusinessEventActionAt(prev, index))
          }
          />
        </TabsContent>

        <TabsContent value='statuses' className='mt-0'>
          <BusinessEventSourceStatusSection
          statuses={draft.config.statuses}
          sourceCode={draft.code}
          summary={statusSummary}
          dirty={diff.statuses.dirty}
          changeSummary={getBusinessEventSourceSectionDiffSummary(diff.statuses)}
          saving={savingSections.statuses}
          saveDisabled={
            savingSections.statuses ||
            validationBySection.statuses.length > 0 ||
            !diff.statuses.dirty
          }
          undoAvailable={Boolean(undoPatches.statuses)}
          undoDisabled={undoingSections.statuses}
          undoing={undoingSections.statuses}
          removedItems={removedStatusItems}
          sectionRef={statusesSectionRef}
          alwaysOpen
          focusedRemovedItemId={
            focusedTarget?.section === 'statuses' &&
            focusedTarget.changeType === 'removed'
              ? (focusedTarget.itemId ?? null)
              : null
          }
          forceOpenRemovedItems={
            focusedTarget?.section === 'statuses' &&
            focusedTarget.changeType === 'removed'
          }
          getChangeType={(id) =>
            getBusinessEventSourceItemChangeKind(diff.statuses, id)
          }
          onRestoreRemovedItem={restoreRemovedStatusItem}
          onSave={() => void saveSection('statuses')}
          onUndo={
            undoPatches.statuses ? () => void undoSection('statuses') : undefined
          }
          onEdit={() => setEditorMode('statuses')}
          />
        </TabsContent>

        <TabsContent value='fields' className='mt-0'>
          <BusinessEventSourceFieldSection
          fields={draft.config.fields}
          summary={fieldSummary}
          dirty={diff.fields.dirty}
          changeSummary={getBusinessEventSourceSectionDiffSummary(diff.fields)}
          saving={savingSections.fields}
          saveDisabled={
            savingSections.fields ||
            validationBySection.fields.length > 0 ||
            !diff.fields.dirty
          }
          undoAvailable={Boolean(undoPatches.fields)}
          undoDisabled={undoingSections.fields}
          undoing={undoingSections.fields}
          removedItems={removedFieldItems}
          sectionRef={fieldsSectionRef}
          alwaysOpen
          focusedRemovedItemId={
            focusedTarget?.section === 'fields' &&
            focusedTarget.changeType === 'removed'
              ? (focusedTarget.itemId ?? null)
              : null
          }
          forceOpenRemovedItems={
            focusedTarget?.section === 'fields' &&
            focusedTarget.changeType === 'removed'
          }
          getChangeType={(id) =>
            getBusinessEventSourceItemChangeKind(diff.fields, id)
          }
          onRestoreRemovedItem={restoreRemovedFieldItem}
          onSave={() => void saveSection('fields')}
          onUndo={
            undoPatches.fields ? () => void undoSection('fields') : undefined
          }
          onEdit={() => setEditorMode('fields')}
          />
        </TabsContent>

        <TabsContent value='resolvers' className='mt-0'>
          <BusinessEventSourceResolverSection
          resolvers={draft.config.dynamicResolvers}
          persistedResolverIds={persistedResolverIds}
          dirty={diff.dynamicResolvers.dirty}
          changeSummary={getBusinessEventSourceSectionDiffSummary(
            diff.dynamicResolvers
          )}
          saving={savingSections.dynamicResolvers}
          saveDisabled={
            savingSections.dynamicResolvers ||
            validationBySection.dynamicResolvers.length > 0 ||
            !diff.dynamicResolvers.dirty
          }
          undoAvailable={Boolean(undoPatches.dynamicResolvers)}
          undoDisabled={undoingSections.dynamicResolvers}
          undoing={undoingSections.dynamicResolvers}
          removedItems={removedResolverItems}
          sectionRef={dynamicResolversSectionRef}
          alwaysOpen
          focusedItemId={
            focusedTarget?.section === 'dynamicResolvers' &&
            focusedTarget.changeType !== 'removed'
              ? (focusedTarget.itemId ?? null)
              : null
          }
          focusedRemovedItemId={
            focusedTarget?.section === 'dynamicResolvers' &&
            focusedTarget.changeType === 'removed'
              ? (focusedTarget.itemId ?? null)
              : null
          }
          forceOpenRemovedItems={
            focusedTarget?.section === 'dynamicResolvers' &&
            focusedTarget.changeType === 'removed'
          }
          onAdd={() =>
            applyDraft((prev) => appendBusinessDynamicResolver(prev))
          }
          onSave={() => void saveSection('dynamicResolvers')}
          onUndo={
            undoPatches.dynamicResolvers
              ? () => void undoSection('dynamicResolvers')
              : undefined
          }
          onRestoreRemovedItem={restoreRemovedResolverItem}
          getChangeType={(id) =>
            getBusinessEventSourceItemChangeKind(diff.dynamicResolvers, id)
          }
          onCodeChange={(index, value) =>
            applyDraft((prev) =>
              updateBusinessDynamicResolverAt(prev, index, {
                code: value,
              })
            )
          }
          onLabelChange={(index, value) =>
            applyDraft((prev) =>
              updateBusinessDynamicResolverAt(prev, index, {
                label: value,
              })
            )
          }
          onPathChange={(index, value) =>
            applyDraft((prev) =>
              updateBusinessDynamicResolverAt(prev, index, {
                path: value,
              })
            )
          }
          onTypeChange={(index, value) =>
            applyDraft((prev) =>
              updateBusinessDynamicResolverAt(prev, index, {
                type: value,
              })
            )
          }
          onDelete={(index) =>
            applyDraft((prev) => removeBusinessDynamicResolverAt(prev, index))
          }
          />
        </TabsContent>

        <TabsContent value='base' className='mt-0'>
          <BusinessEventSourceBaseSection
            source={draft}
            isIdentityLocked={isIdentityLocked}
            dirty={diff.general.dirty}
            changeSummary={getBusinessEventSourceGeneralDiffSummary(diff.general)}
            focused={focusedTarget?.section === 'general'}
            hasValidationErrors={validationBySection.general.length > 0}
            saving={savingSections.general}
            saveDisabled={
              savingSections.general ||
              validationBySection.general.length > 0 ||
              !diff.general.dirty
            }
            undoAvailable={Boolean(undoPatches.general)}
            undoDisabled={undoingSections.general}
            undoing={undoingSections.general}
            sectionRef={generalSectionRef}
            alwaysOpen
            onSave={() => void saveSection('general')}
            onUndo={
              undoPatches.general ? () => void undoSection('general') : undefined
            }
            onCodeChange={(value) =>
              applyDraft((prev) =>
                updateBusinessEventSourceDraft(prev, {
                  code: value,
                })
              )
            }
            onModuleChange={(value) =>
              applyDraft((prev) =>
                updateBusinessEventSourceDraft(prev, {
                  module: value,
                })
              )
            }
            onEntityChange={(value) =>
              applyDraft((prev) =>
                updateBusinessEventSourceDraft(prev, {
                  entity: value,
                })
              )
            }
            onDefaultActionUrlTemplateChange={(value) =>
              applyDraft((prev) =>
                updateBusinessEventSourceConfig(prev, {
                  defaultActionUrlTemplate: value,
                })
              )
            }
          />
        </TabsContent>
      </Tabs>

      <BusinessEventSourceEditorOverlay
        editorMode={editorMode}
        sourceCode={draft.code}
        statuses={draft.config.statuses}
        fields={draft.config.fields}
        persistedStatusIds={persistedStatusIds}
        committedStatusCodeMap={committedStatusCodeMap}
        statusReferenceMap={statusReferenceMap}
        statusRenamePlans={statusRenamePlans}
        statusRenameBatchAnalysis={statusRenameBatchAnalysis}
        statusReferencesLoaded={statusReferencesLoaded}
        persistedFieldIds={persistedFieldIds}
        statusDirty={diff.statuses.dirty}
        fieldDirty={diff.fields.dirty}
        statusChangeSummary={getBusinessEventSourceSectionDiffSummary(
          diff.statuses
        )}
        fieldChangeSummary={getBusinessEventSourceSectionDiffSummary(
          diff.fields
        )}
        removedStatusItems={removedStatusItems}
        removedFieldItems={removedFieldItems}
        statusSaveDisabled={
          savingSections.statuses ||
          validationBySection.statuses.length > 0 ||
          !diff.statuses.dirty
        }
        fieldSaveDisabled={
          savingSections.fields ||
          validationBySection.fields.length > 0 ||
          !diff.fields.dirty
        }
        statusSaving={savingSections.statuses}
        fieldSaving={savingSections.fields}
        statusUndoDisabled={undoingSections.statuses}
        fieldUndoDisabled={undoingSections.fields}
        statusUndoing={undoingSections.statuses}
        fieldUndoing={undoingSections.fields}
        statusFocusedItemId={
          focusedTarget?.section === 'statuses' &&
          focusedTarget.changeType !== 'removed'
            ? (focusedTarget.itemId ?? null)
            : null
        }
        fieldFocusedItemId={
          focusedTarget?.section === 'fields' &&
          focusedTarget.changeType !== 'removed'
            ? (focusedTarget.itemId ?? null)
            : null
        }
        statusFocusedRemovedItemId={
          focusedTarget?.section === 'statuses' &&
          focusedTarget.changeType === 'removed'
            ? (focusedTarget.itemId ?? null)
            : null
        }
        fieldFocusedRemovedItemId={
          focusedTarget?.section === 'fields' &&
          focusedTarget.changeType === 'removed'
            ? (focusedTarget.itemId ?? null)
            : null
        }
        statusForceOpenRemovedItems={
          focusedTarget?.section === 'statuses' &&
          focusedTarget.changeType === 'removed'
        }
        fieldForceOpenRemovedItems={
          focusedTarget?.section === 'fields' &&
          focusedTarget.changeType === 'removed'
        }
        getStatusChangeType={(id) =>
          getBusinessEventSourceItemChangeKind(diff.statuses, id)
        }
        getFieldChangeType={(id) =>
          getBusinessEventSourceItemChangeKind(diff.fields, id)
        }
        onOpenChange={(open) => !open && setEditorMode(null)}
        onAddStatus={() => applyDraft((prev) => appendBusinessStatus(prev))}
        onUpdateStatus={(index, updates) =>
          applyDraft((prev) => updateBusinessStatusAt(prev, index, updates))
        }
        onMoveStatus={(index, direction) =>
          applyDraft((prev) => moveBusinessStatus(prev, index, direction))
        }
        onDeleteStatus={(index) =>
          applyDraft((prev) => removeBusinessStatusAt(prev, index))
        }
        onRestoreRemovedStatusItem={restoreRemovedStatusItem}
        onSaveStatuses={() => void saveSection('statuses')}
        onUndoStatuses={
          undoPatches.statuses ? () => void undoSection('statuses') : undefined
        }
        onAddField={() => applyDraft((prev) => appendBusinessEventField(prev))}
        onUpdateField={(index, updates) =>
          applyDraft((prev) => updateBusinessEventFieldAt(prev, index, updates))
        }
        onDeleteField={(index) =>
          applyDraft((prev) => removeBusinessEventFieldAt(prev, index))
        }
        onRestoreRemovedFieldItem={restoreRemovedFieldItem}
        onSaveFields={() => void saveSection('fields')}
        onUndoFields={
          undoPatches.fields ? () => void undoSection('fields') : undefined
        }
      />
      </CollapsibleContent>
    </Collapsible>
    <BusinessEventSourceDeleteDialog
      open={deleteDialogOpen}
      onOpenChange={(open) => {
        if (!isDeleting) {
          setDeleteDialogOpen(open)
        }
      }}
      sourceName={committedSource.name}
      sourceCode={committedSource.code}
      referencingRuleCount={referencingRules.length}
      referencingRuleNames={referencingRules.map((rule) => rule.name)}
      isDeleting={isDeleting}
      onConfirm={async () => {
        setIsDeleting(true)
        try {
          await onDelete(committedSource.id)
          setDeleteDialogOpen(false)
        } finally {
          setIsDeleting(false)
        }
      }}
    />
    </>
  )
}
