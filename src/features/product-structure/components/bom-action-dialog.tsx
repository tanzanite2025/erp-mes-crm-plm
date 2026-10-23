'use client'

import { useEffect, useMemo } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { Form } from '@/components/ui/form'
import { type BOM } from '../data/schema'
import { useBOMForm } from '../hooks/use-bom-form'
import { useBOMOptimisticLock } from '../hooks/use-bom-optimistic-lock'
import {
  useBOMPermissionGuard,
  createBOMPermissionContext,
} from '../hooks/use-bom-permission-guard'
import { useBOMProtocolRecovery } from '../hooks/use-bom-protocol-recovery'
import { useBOMRelationDeltaTracker } from '../hooks/use-bom-relation-delta-tracker'
import { useBOMSubmitOrchestrator } from '../hooks/use-bom-submit-orchestrator'
import { type BOMItemDraft, type SaveBOMInput } from '../mutation-types'
import { buildBOMRelationSidecar } from '../utils/bom-relation-sidecar'
import { BOMDialogFooter } from './bom-dialog-footer'
import { BOMDialogResourceBoundary } from './bom-dialog-resource-boundary'
import { BOMDialogShell } from './bom-dialog-shell'
import { BOMEditorProductInformationAndRecipeLayout } from './bom-editor/bom-editor-product-information-and-recipe-layout'
import { BOMProductConfigurationInformationPanel } from './bom-editor/bom-product-configuration-information-panel'
import { BOMWorkspace } from './bom-editor/bom-workspace'
import { BOMProtocolRecoveryDialog } from './bom-protocol-recovery-dialog'
import { BOMReadOnlyBanner } from './bom-readonly-banner'
import { BOMVersionConflictDialog } from './bom-version-conflict-dialog'

const logger = createLogger('BOMActionDialog')

type BOMActionDialogProps = {
  currentRow?: BOM
  initialItems?: BOMItemDraft[]
  initialProductId?: string
  wizardHeader?: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: SaveBOMInput) => BOM | Promise<BOM | null>
  onPromote?: (
    id: string,
    status: string,
    expectedVersion?: number
  ) => Promise<boolean>
}

export function BOMActionDialog({
  currentRow,
  initialItems,
  initialProductId,
  wizardHeader,
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
      logger.warn('Permission denied', { action, reason })
    },
  })

  // Sidecar delta tracker
  const deltaTracker = useBOMRelationDeltaTracker(currentRow?.relationSidecar)
  const { updateSidecar } = deltaTracker

  // Optimistic lock
  const optimisticLock = useBOMOptimisticLock(currentRow)
  const { hasConflict, conflictError, clearConflict } = optimisticLock

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
      logger.info('Protocol recovered successfully')
    },
    onRecoveryFailed: (error) => {
      logger.error('Protocol recovery failed', error)
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

  // The tracker initializes its baseline from currentRow; only synchronize draft changes here.
  useEffect(() => {
    if (effectiveProtocolDraft) {
      updateSidecar(buildBOMRelationSidecar(effectiveProtocolDraft))
    }
  }, [effectiveProtocolDraft, updateSidecar])

  // 提交编排（submit + promote）
  const { submit: handleFormSubmit, promote: handlePromote } =
    useBOMSubmitOrchestrator({
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
        wizardHeader={wizardHeader}
        open={open}
        onOpenChange={onOpenChange}
        isEdit={isEdit}
        headerMeta={{
          version: typeof bomVersion === 'string' ? bomVersion : '',
          status: typeof status === 'string' ? status : '',
        }}
        auditTarget={
          isEdit && currentRow?.id
            ? { id: currentRow.id, name: currentRow.bomNo }
            : undefined
        }
      >
        <Form {...typedForm}>
          <form
            id='bom-form'
            onSubmit={typedForm.handleSubmit(handleFormSubmit)}
            className='flex min-h-0 flex-1 flex-col overflow-hidden'
          >
            <BOMDialogResourceBoundary
              resource={optionsResource}
              detailResource={detailSourceResource}
            >
              <div className='flex min-h-0 flex-1 flex-col'>
                {isLocked && (
                  <div className='shrink-0 px-3 pb-2 sm:px-4'>
                    <BOMReadOnlyBanner
                      isLocked={isLocked}
                      version={currentRow?.version}
                    />
                  </div>
                )}
                <BOMEditorProductInformationAndRecipeLayout
                  productInformation={
                    <BOMProductConfigurationInformationPanel
                      form={typedForm}
                      products={products}
                      productDisplayLabelMap={productDisplayLabelMap}
                      isEdit={isEdit}
                    />
                  }
                  recipeDetails={
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
                  }
                />

                <div
                  className={cn(
                    'shrink-0 px-3 pb-3 sm:px-4 sm:pb-4',
                    wizardHeader && '[&_button]:rounded-full'
                  )}
                >
                  <BOMDialogFooter
                    currentRow={currentRow}
                    onPromote={handlePromote}
                    isSubmitDisabled={isLocked}
                  />
                </div>
              </div>
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
