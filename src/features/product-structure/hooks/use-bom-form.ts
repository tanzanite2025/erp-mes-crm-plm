import { useMemo } from 'react'
import { type BOM } from '../data/schema'
import { type BOMItemDraft } from '../mutation-types'
import { createEmptyBOMFormValue } from '../utils/bom-form-defaults'
import { buildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource } from './bom-workspace-protocol-source-adapter'
import { useBOMEditDetailSource } from './use-bom-edit-detail-source'
import { useBOMFormInitialization } from './use-bom-form-initialization'
import { useBOMFormOptions } from './use-bom-form-options'
import { useBOMFormState } from './use-bom-form-state'
import { useBOMProtocolSync } from './use-bom-protocol-sync'

interface UseBOMFormProps {
  currentRow?: BOM
  initialItems?: BOMItemDraft[]
  initialProductId?: string
  open: boolean
  isEdit: boolean
}

export function useBOMForm({
  currentRow,
  initialItems,
  initialProductId,
  open,
  isEdit,
}: UseBOMFormProps) {
  const initialValues = useMemo<BOM>(() => createEmptyBOMFormValue(), [])
  const { form, fields, append, remove } = useBOMFormState({
    initialValues,
  })

  const optionsResource = useBOMFormOptions({
    open,
  })
  const products = useMemo(
    () => (optionsResource.status === 'ready' ? optionsResource.products : []),
    [optionsResource]
  )
  const productDisplayLabelMap = useMemo(
    () =>
      optionsResource.status === 'ready'
        ? optionsResource.productDisplayLabelMap
        : new Map<string, string>(),
    [optionsResource]
  )
  const materials = useMemo(
    () => (optionsResource.status === 'ready' ? optionsResource.materials : []),
    [optionsResource]
  )
  const sections = useMemo(
    () => (optionsResource.status === 'ready' ? optionsResource.sections : []),
    [optionsResource]
  )
  const watchedItems = form.watch('items')
  const detailSourceResource = useBOMEditDetailSource({
    bomId: currentRow?.id,
    open,
    isEdit,
    activeSections: sections,
    fields,
    watchedItems,
  })
  const resolvedCurrentRow = isEdit
    ? detailSourceResource?.status === 'ready'
      ? detailSourceResource.data.bom
      : undefined
    : currentRow
  const liveProtocolDraft = useMemo(
    () =>
      buildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource({
        sourceBOM: {
          ...form.getValues(),
          items: watchedItems,
        } as BOM,
        activeSections: sections,
        fields,
        watchedItems,
      }),
    [fields, form, sections, watchedItems]
  )

  const authoritativeProtocolDraft =
    isEdit && detailSourceResource?.status === 'ready'
      ? detailSourceResource.data.protocolDraft
      : undefined

  const rawProtocolDraft = isEdit
    ? authoritativeProtocolDraft
    : liveProtocolDraft

  // Synchronize protocol with current form state to prevent drift
  const { needsSync, validation, syncedProtocol } = useBOMProtocolSync({
    form,
    fields,
    sections,
    protocolDraft: rawProtocolDraft,
    authoritativeProtocolDraft,
    sourceBOM: {
      ...form.getValues(),
      items: watchedItems,
    } as BOM,
  })

  // Use synced protocol if sync was needed, otherwise use raw protocol
  const protocolDraft = syncedProtocol || rawProtocolDraft

  useBOMFormInitialization({
    form,
    currentRow: resolvedCurrentRow,
    initialItems,
    initialProductId,
    sections,
    open,
    isEdit,
  })

  return {
    form,
    fields,
    append,
    remove,
    optionsResource,
    detailSourceResource,
    protocolDraft,
    protocolSyncStatus: {
      needsSync,
      validation,
    },
    products,
    productDisplayLabelMap,
    materials,
    sections,
  }
}
