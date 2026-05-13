'use client'

import { useEffect, useMemo } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { failLoudly } from '@/lib/safe-catch'
import { Form } from '@/components/ui/form'
import { BOMFormHeader } from './bom-editor/bom-form-header'
import { BOMWorkspace } from './bom-editor/bom-workspace'
import { BOMDialogFooter } from './bom-dialog-footer'
import { BOMDialogResourceBoundary } from './bom-dialog-resource-boundary'
import { BOMDialogShell } from './bom-dialog-shell'
import { BOMProtocolSyncAlert } from './bom-protocol-sync-alert'
import { type BOM } from '../data/schema'
import { useBOMForm } from '../hooks/use-bom-form'
import { useBOMRelationDeltaTracker } from '../hooks/use-bom-relation-delta-tracker'
import { useBOMOptimisticLock } from '../hooks/use-bom-optimistic-lock'
import { useBOMProtocolRecovery } from '../hooks/use-bom-protocol-recovery'
import { useBOMPermissionGuard, createBOMPermissionContext } from '../hooks/use-bom-permission-guard'
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
    protocolSyncStatus,
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

  // Initialize permission guard for access control
  const permissionContext = useMemo(
    () => createBOMPermissionContext(currentRow, isEdit),
    [currentRow, isEdit]
  )
  
  const permissionGuard = useBOMPermissionGuard({
    context: permissionContext,
    form: typedForm,
    onPermissionDenied: (action, reason) => {
      console.warn(`[BOM Permission] ${action} denied: ${reason}`)
      // Could show toast notification here
    },
  })

  // Initialize delta tracker for RelationSidecar changes
  const {
    resetBaseline,
    updateSidecar,
    commitDelta,
    isDirty: isSidecarDirty,
  } = useBOMRelationDeltaTracker(currentRow?.relationSidecar)

  // Initialize optimistic locking for concurrency control
  const {
    currentVersion,
    updateVersion,
    validateVersion,
    hasConflict,
    conflictError,
    clearConflict,
    prepareSavePayload,
  } = useBOMOptimisticLock(currentRow)

  // Initialize protocol recovery for graceful error handling
  const {
    needsRecovery,
    error: recoveryError,
    recoveredProtocol,
    attemptRecovery,
    clearRecovery,
    isRecovering,
  } = useBOMProtocolRecovery({
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

  // Use recovered protocol if recovery succeeded
  const effectiveProtocolDraft = recoveredProtocol || protocolDraft

  // Reset baseline when loading BOM from backend
  useEffect(() => {
    if (isEdit && currentRow?.relationSidecar) {
      resetBaseline(currentRow.relationSidecar)
    }
  }, [isEdit, currentRow?.relationSidecar, resetBaseline])

  // Update tracked sidecar when protocol draft changes
  useEffect(() => {
    if (effectiveProtocolDraft) {
      const newSidecar = buildBOMRelationSidecar(effectiveProtocolDraft)
      updateSidecar(newSidecar)
    }
  }, [effectiveProtocolDraft, updateSidecar])

  const handleFormSubmit = async (data: BOM) => {
    // Permission check
    if (!permissionGuard.canSave) {
      const reason = permissionGuard.getDenialReason()
      console.warn('[BOM] Save blocked:', reason)
      return null
    }

    if (isEdit && !typedForm.formState.isDirty && !isSidecarDirty) {
      onOpenChange(false)
      return null
    }

    if (!effectiveProtocolDraft) {
      failLoudly(
        new Error('[CRITICAL] Missing effective BOM relation sidecar protocol draft during save submit'),
        'BOMActionDialog.handleFormSubmit'
      )
      return null
    }

    // Commit delta to get only changed fields
    const sidecarDelta = commitDelta()
    
    // Build full sidecar for submission
    const fullSidecar = buildBOMRelationSidecar(effectiveProtocolDraft)

    // Prepare payload with optimistic lock version check
    const basePayload: SaveBOMInput = {
      ...data,
      relationSidecar: fullSidecar,
      _sidecarDelta: sidecarDelta,
    }
    
    const submitData = prepareSavePayload(basePayload, currentVersion)

    if (onSubmit) {
      const result = await onSubmit(submitData)
      
      if (result) {
        // Validate version to detect conflicts
        const conflict = validateVersion(result.version)
        
        if (conflict) {
          // Version conflict detected - don't close dialog
          console.warn('[BOM] Version conflict detected:', conflict)
          return null
        }
        
        // Success - update tracked version and reset baseline
        updateVersion(result.version)
        
        if (fullSidecar) {
          resetBaseline(fullSidecar)
        }
      }
      
      return result
    }

    onOpenChange(false)
    return null
  }

  const handlePromote = async (targetStatus: string) => {
    // Permission check
    if (!permissionGuard.canPromote) {
      const reason = permissionGuard.getDenialReason()
      console.warn('[BOM] Promote blocked:', reason)
      return
    }

    const currentData = typedForm.getValues()
    if (!effectiveProtocolDraft) return

    const basePayload: SaveBOMInput = {
      ...currentData,
      relationSidecar: buildBOMRelationSidecar(effectiveProtocolDraft),
    }
    
    const submitData = prepareSavePayload(basePayload, currentVersion)

    let bomToPromote = currentRow
    if (!bomToPromote?.id || typedForm.formState.isDirty) {
      if (!onSubmit) return
      const saved = await onSubmit(submitData)
      if (!saved) return
      
      // Validate version
      const conflict = validateVersion(saved.version)
      if (conflict) {
        console.warn('[BOM] Version conflict during promote:', conflict)
        return
      }
      
      updateVersion(saved.version)
      bomToPromote = saved
    }

    if (bomToPromote?.id && onPromote) {
      const success = await onPromote(bomToPromote.id, targetStatus, bomToPromote.version)
      if (success) {
        onOpenChange(false)
      }
    }
  }

  const isLocked = currentRow?.isLocked || false

  return (
    <>
      <BOMDialogShell
        open={open}
        onOpenChange={onOpenChange}
        isEdit={isEdit}
        auditTarget={isEdit && currentRow?.id ? { id: currentRow.id, name: currentRow.bomNo } : undefined}
      >
        <Form {...typedForm}>
          <form
            id='bom-form'
            onSubmit={typedForm.handleSubmit(handleFormSubmit)}
            className='flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 pb-3 pt-0 sm:px-4 sm:pb-4'
          >
            <BOMDialogResourceBoundary resource={optionsResource} detailResource={detailSourceResource}>
              {/* Show read-only banner if locked */}
              <BOMReadOnlyBanner isLocked={isLocked} version={currentRow?.version} />
              
              {/* Show protocol sync warnings if any */}
              {protocolSyncStatus && (
                <BOMProtocolSyncAlert
                  validation={protocolSyncStatus.validation}
                  needsSync={protocolSyncStatus.needsSync}
                />
              )}
              
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

      {/* Version Conflict Dialog */}
      <BOMVersionConflictDialog
        open={hasConflict}
        error={conflictError}
        onRefresh={() => {
          clearConflict()
          window.location.reload()
        }}
        onCancel={clearConflict}
      />

      {/* Protocol Recovery Dialog */}
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
