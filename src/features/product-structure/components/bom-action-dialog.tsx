'use client'

import { useEffect, useMemo } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { Form } from '@/components/ui/form'
import { BOMFormHeader } from './bom-editor/bom-form-header'
import { BOMWorkspace } from './bom-editor/bom-workspace'
import { BOMDialogFooter } from './bom-dialog-footer'
import { BOMDialogResourceBoundary } from './bom-dialog-resource-boundary'
import { BOMDialogShell } from './bom-dialog-shell'
import { type BOM } from '../data/schema'
import { useBOMForm } from '../hooks/use-bom-form'
import { useBOMRelationDeltaTracker } from '../hooks/use-bom-relation-delta-tracker'
import { useBOMOptimisticLock } from '../hooks/use-bom-optimistic-lock'
import { useBOMProtocolRecovery } from '../hooks/use-bom-protocol-recovery'
import { useBOMPermissionGuard, createBOMPermissionContext } from '../hooks/use-bom-permission-guard'
import { useBOMSubmitOrchestrator } from '../hooks/use-bom-submit-orchestrator'
import { type BOMItemDraft, type SaveBOMInput } from '../mutation-types'
import { buildBOMRelationSidecar } from '../utils/bom-relation-sidecar'
import { BOMVersionConflictDialog } from './bom-version-conflict-dialog'
import { BOMProtocolRecoveryDialog } from './bom-protocol-recovery-dialog'
import { BOMReadOnlyBanner } from './bom-readonly-banner'

type BOMActionDialogProps = {
  currentRow?: BOM
  initialItems?: BOMItemDraft[]
  initialProductId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: SaveBOMInput) => BOM | Promise<BOM | null>
  onPromote?: (id: string, status: string, expectedVersion?: number) => Promise<boolean>
}

export function BOMActionDialog({
  currentRow,
  initialItems,
  initialProductId,
  open,
  onOpenChange,
  onSubmit,
  onPromote,
}: BOMActionDialogProps) {
  const isEdit = Boolean(currentRow)
  const {
    form,
    fields,
    append,
    remove,
    optionsResource,
    detailSourceResource,
    protocolDraft,
    products,
    productDisplayLabelMap,
    materials,
    sections,
  } = useBOMForm({
    currentRow,
    initialItems,
    initialProductId,
    open,
    isEdit,
  })
  const typedForm = form as UseFormReturn<BOM>
  const bomVersion = typedForm.watch('bomVersion')
  const status = typedForm.watch('status')

  // Permission guard
  const permissionContext = useMemo(
    () => createBOMPermissionContext(currentRow, isEdit),
    [currentRow, isEdit]
  )
  const permissionGuard = useBOMPermissionGuard({
    context: permissionContext,
    form: typedForm,
    onPermissionDenied: (action, reason) => {
      console.warn(`[BOM Permission] ${action} denied: ${reason}`)
    },
  })

  // Sidecar delta tracker
  const deltaTracker = useBOMRelationDeltaTracker(currentRow?.relationSidecar)

  // Optimistic lock
  const optimisticLock = useBOMOptimisticLock(currentRow)
  const {
    hasConflict,
    conflictError,
    clearConflict,
  } = optimisticLock

  // Protocol recovery
  const protocolRecovery = useBOMProtocolRecovery({
    sourceBOM: {
      ...form.getValues(),
      items: form.watch('items'),
    } as BOM,
    sections,
    fields,
    watchedItems: form.watch('items'),
    protocolDraft,
    onRecoverySuccess: () => {
      console.log('[BOM] Protocol recovered successfully')
    },
    onRecoveryFailed: (error) => {
      console.error('[BOM] Protocol recovery failed:', error)
    },
  })
  const {
    needsRecovery,
    error: recoveryError,
    recoveredProtocol,
    attemptRecovery,
    clearRecovery,
    isRecovering,
  } = protocolRecovery

  // 应用 recovery 后的 protocol draft
  const effectiveProtocolDraft = recoveredProtocol || protocolDraft

  // 重置 baseline / 同步 sidecar 副作用
  useEffect(() => {
    if (isEdit && currentRow?.relationSidecar) {
      deltaTracker.resetBaseline(currentRow.relationSidecar)
    }
  }, [isEdit, currentRow?.relationSidecar, deltaTracker])

  useEffect(() => {
    if (effectiveProtocolDraft) {
      deltaTracker.updateSidecar(buildBOMRelationSidecar(effectiveProtocolDraft))
    }
  }, [effectiveProtocolDraft, deltaTracker])

  // 提交编排（submit + promote）
  const { submit: handleFormSubmit, promote: handlePromote } = useBOMSubmitOrchestrator({
    isEdit,
    currentRow,
    form: typedForm,
    effectiveProtocolDraft,
    isSidecarDirty: deltaTracker.isDirty,
    permissionGuard,
    optimisticLock,
    deltaTracker,
    onSubmit,
    onPromote,
    onClose: () => onOpenChange(false),
  })

  const isLocked = currentRow?.isLocked || false

  return (
    <>
      <BOMDialogShell
        open={open}
        onOpenChange={onOpenChange}
        isEdit={isEdit}
        headerMeta={{
          version: typeof bomVersion === 'string' ? bomVersion : '',
          status: typeof status === 'string' ? status : '',
        }}
        auditTarget={isEdit && currentRow?.id ? { id: currentRow.id, name: currentRow.bomNo } : undefined}
      >
        <Form {...typedForm}>
          <form
            id='bom-form'
            onSubmit={typedForm.handleSubmit(handleFormSubmit)}
            className='flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 pb-3 pt-0 sm:px-4 sm:pb-4'
          >
            <BOMDialogResourceBoundary resource={optionsResource} detailResource={detailSourceResource}>
              <BOMReadOnlyBanner isLocked={isLocked} version={currentRow?.version} />

              <BOMFormHeader
                form={typedForm}
                products={products}
                productDisplayLabelMap={productDisplayLabelMap}
                isEdit={isEdit}
              />

              <BOMWorkspace
                form={typedForm}
                fields={fields}
                materials={materials}
                sections={sections}
                append={append}
                remove={remove}
                protocolDraft={effectiveProtocolDraft}
                permissionGuard={permissionGuard}
              />

              <BOMDialogFooter
                form={typedForm}
                currentRow={currentRow}
                onPromote={handlePromote}
                isSubmitDisabled={isLocked}
              />
            </BOMDialogResourceBoundary>
          </form>
        </Form>
      </BOMDialogShell>

      <BOMVersionConflictDialog
        open={hasConflict}
        error={conflictError}
        onRefresh={() => {
          clearConflict()
          window.location.reload()
        }}
        onCancel={clearConflict}
      />

      <BOMProtocolRecoveryDialog
        open={needsRecovery}
        error={recoveryError}
        isRecovering={isRecovering}
        onRecover={async (strategy) => {
          const success = await attemptRecovery(strategy)
          if (success) {
            clearRecovery()
          }
        }}
        onCancel={clearRecovery}
      />
    </>
  )
}
