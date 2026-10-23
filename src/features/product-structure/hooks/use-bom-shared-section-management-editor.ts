import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { normalizeMachineCode } from '@/lib/codecs/code-normalization'
import { trackDelta } from '@/lib/delta/proxy-tracker'
import { isConflictError } from '@/lib/handle-server-error'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { type BOMSectionConfig } from '../data/bom-section-schema'
import { type BOMSectionCreatePayload } from '../services/bom-section-service'
import { useBOMSectionConfig } from './use-bom-section-config'

interface BOMSharedSectionEditorState {
  section?: BOMSectionConfig
  draft: BOMSectionCreatePayload
}

function createBOMSharedSectionEditorDraft(
  section?: BOMSectionConfig,
  nextSortOrder = 1
): BOMSectionCreatePayload {
  return {
    code: section?.code ?? '',
    name: section?.name ?? '',
    description: section?.description ?? '',
    isSystem: section?.isSystem ?? false,
    active: section?.active ?? true,
    sortOrder: section?.sortOrder ?? nextSortOrder,
    isDefault: section?.isDefault ?? false,
  }
}

function extractBOMSharedSectionWriteErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.trim()
  if (!error || typeof error !== 'object') return ''
  const shape = error as {
    error?: unknown
    message?: unknown
    response?: { data?: { error?: unknown; message?: unknown } }
  }
  const message = [
    shape.error,
    shape.message,
    shape.response?.data?.error,
    shape.response?.data?.message,
  ].find((value) => typeof value === 'string' && value.trim())
  return typeof message === 'string' ? message.trim() : ''
}

/** Shared catalog drafts and writes only. Never receives or submits a BOM form. */
export function useBOMSharedSectionManagementEditor() {
  const resource = useBOMSectionConfig()
  const { t } = useLanguage()
  const { allowsAction } = usePermissionActions()
  const canManage = allowsAction('perm_manage')
  const [editorState, setEditorState] = useState<BOMSharedSectionEditorState>()
  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false)
  const mutationInProgressRef = useRef(false)
  const sortedSections = useMemo(
    () =>
      [...resource.sections].sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.code.localeCompare(right.code)
      ),
    [resource.sections]
  )
  const selectedSection = editorState ? editorState.section : sortedSections[0]
  const draft =
    editorState?.draft ?? createBOMSharedSectionEditorDraft(selectedSection)
  const activeSectionCount = sortedSections.filter(
    (section) => section.active
  ).length
  const isLastActiveSection = Boolean(
    selectedSection?.active && activeSectionCount <= 1
  )
  const canDeleteSelectedSection =
    canManage &&
    Boolean(selectedSection) &&
    !selectedSection?.isSystem &&
    !isLastActiveSection

  function selectBOMSharedSectionForInlineEditing(section: BOMSectionConfig) {
    if (mutationInProgressRef.current) return
    setEditorState({
      section,
      draft: createBOMSharedSectionEditorDraft(section),
    })
    setIsConfirmingDeletion(false)
  }

  function startCreatingBOMSharedSection() {
    if (!canManage || mutationInProgressRef.current) return
    const nextSortOrder =
      Math.max(0, ...sortedSections.map((section) => section.sortOrder)) + 1
    setEditorState({
      draft: createBOMSharedSectionEditorDraft(undefined, nextSortOrder),
    })
    setIsConfirmingDeletion(false)
  }

  function updateBOMSharedSectionEditorDraft(
    patch: Partial<BOMSectionCreatePayload>
  ) {
    if (!canManage || mutationInProgressRef.current) return
    const nextDraft = { ...draft, ...patch }
    if (patch.isDefault === true) nextDraft.active = true
    if (patch.active === false) nextDraft.isDefault = false
    setEditorState({ section: selectedSection, draft: nextDraft })
    setIsConfirmingDeletion(false)
  }

  function showBOMSharedSectionWriteError(
    error: unknown,
    operation: 'save' | 'delete'
  ) {
    const message = extractBOMSharedSectionWriteErrorMessage(error)
    const normalizedMessage = message.toLowerCase()
    if (normalizedMessage.includes('bom section identifier conflict'))
      toast.error(t('engineering.bomSectionConfig.toasts.identifierConflict'))
    else if (
      normalizedMessage.includes('at least one active bom section is required')
    )
      toast.error(t('engineering.bomSectionConfig.toasts.lastActiveBlocked'))
    else if (message.includes('系统 BOM section 不允许删除'))
      toast.error(t('engineering.bomSectionConfig.toasts.deleteProtected'))
    else if (message.includes('BOM section 已被配方引用，无法删除'))
      toast.error(t('engineering.bomSectionConfig.toasts.deleteLinked'))
    else if (isConflictError(error))
      toast.error(t('engineering.bomSectionConfig.toasts.conflict'))
    else {
      failLoudly(error, `BOMSharedSectionManagement.${operation}`, {
        silentUI: true,
      })
      toast.error(
        t(
          operation === 'save'
            ? 'engineering.bomSectionConfig.toasts.saveFailed'
            : 'engineering.bomSectionConfig.toasts.deleteFailed'
        )
      )
    }
  }

  async function saveBOMSharedSectionEditorDraft() {
    if (!canManage || mutationInProgressRef.current) return
    if (!draft.code.trim() || !draft.name.trim()) {
      toast.error(t('engineering.bomSectionConfig.toasts.formIncomplete'))
      return
    }
    if (isLastActiveSection && !draft.active) {
      toast.error(t('engineering.bomSectionConfig.toasts.lastActiveBlocked'))
      return
    }
    mutationInProgressRef.current = true
    try {
      let savedSection: BOMSectionConfig
      if (selectedSection) {
        const tracker = trackDelta(selectedSection)
        Object.assign(tracker.data, {
          name: draft.name.trim(),
          description: draft.description.trim(),
          active: draft.active,
          sortOrder: draft.sortOrder,
          isDefault: draft.isDefault,
        })
        const delta = tracker.commit()
        if (Object.keys(delta).length === 0) return
        savedSection = await resource.patchSection({
          id: selectedSection.id,
          version: selectedSection.version,
          delta,
        })
      } else {
        savedSection = await resource.createSection({
          ...draft,
          code: normalizeMachineCode(draft.code),
          name: draft.name.trim(),
          description: draft.description.trim(),
          isSystem: false,
        })
      }
      setEditorState({
        section: savedSection,
        draft: createBOMSharedSectionEditorDraft(savedSection),
      })
      toast.success(t('engineering.bomSectionConfig.toasts.saveSuccess'))
    } catch (error) {
      showBOMSharedSectionWriteError(error, 'save')
    } finally {
      mutationInProgressRef.current = false
    }
  }

  async function deleteSelectedBOMSharedSection() {
    if (
      !canDeleteSelectedSection ||
      !selectedSection ||
      !isConfirmingDeletion ||
      mutationInProgressRef.current
    )
      return
    mutationInProgressRef.current = true
    try {
      await resource.deleteSection(selectedSection.id)
      setEditorState(undefined)
      setIsConfirmingDeletion(false)
      toast.success(t('engineering.bomSectionConfig.toasts.deleteSuccess'))
    } catch (error) {
      showBOMSharedSectionWriteError(error, 'delete')
    } finally {
      mutationInProgressRef.current = false
    }
  }

  return {
    ...resource,
    sortedSections,
    selectedSection,
    draft,
    canManage,
    isLastActiveSection,
    canDeleteSelectedSection,
    isConfirmingDeletion,
    setIsConfirmingDeletion,
    selectBOMSharedSectionForInlineEditing,
    startCreatingBOMSharedSection,
    updateBOMSharedSectionEditorDraft,
    saveBOMSharedSectionEditorDraft,
    deleteSelectedBOMSharedSection,
  }
}

export type BOMSharedSectionManagementEditor = ReturnType<
  typeof useBOMSharedSectionManagementEditor
>
