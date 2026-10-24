'use client'

import { useCallback, useRef, useState } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { type BOM, type BOMParentChildrenProtocolDraft } from '../data/schema'
import { type SaveBOMInput } from '../mutation-types'
import {
  buildBOMRelationSidecar,
  type BOMRelationSidecar,
} from '../utils/bom-relation-sidecar'
import { type OptimisticLockResult } from './use-bom-optimistic-lock'
import { type BOMPermissionGuard } from './use-bom-permission-guard'
import { type BOMRelationDeltaTrackerResult } from './use-bom-relation-delta-tracker'

const logger = createLogger('useBOMSubmitOrchestrator')

/**
 * BOMActionDialog 的提交编排（submit + promote）。
 *
 * 把原本 BOMActionDialog 中两段较长的 handler（handleFormSubmit ~60 行 +
 * handlePromote ~30 行）抽出，让 dialog 文件回归"装配 + JSX"。
 *
 * 编排涉及的 cross-concern：
 *   - 权限守卫（permissionGuard）
 *   - dirty 检测（react-hook-form formState + sidecar tracker）
 *   - relation sidecar 构建（protocolDraft → BOMRelationSidecar）
 *   - delta 提交（用于 SDRTS 协议 diff）
 *   - 乐观锁版本注入与冲突校验（optimistic lock）
 *   - 保存后 baseline 重置（sidecar tracker）
 *   - 草稿在同一请求内保存并发布；只读记录通过独立状态入口流转
 *
 * 本 hook 不承担 UI 副作用（toast / 弹窗）—— 这些由各底层 hook 内部处理。
 */
export interface UseBOMSubmitOrchestratorParams {
  isEdit: boolean
  currentRow?: BOM
  form: UseFormReturn<BOM>
  /** 已应用 protocol recovery 的最终 protocol draft（recovered ?? original）。 */
  effectiveProtocolDraft: BOMParentChildrenProtocolDraft | null | undefined
  isSidecarDirty: boolean
  permissionGuard: BOMPermissionGuard
  optimisticLock: Pick<
    OptimisticLockResult,
    | 'currentVersion'
    | 'updateVersion'
    | 'validateVersion'
    | 'prepareSavePayload'
  >
  deltaTracker: Pick<
    BOMRelationDeltaTrackerResult,
    'commitDelta' | 'resetBaseline'
  >
  onSubmit?: (data: SaveBOMInput) => BOM | Promise<BOM | null>
  onPromote?: (
    id: string,
    status: string,
    expectedVersion?: number
  ) => Promise<boolean>
  onClose: () => void
}

export interface UseBOMSubmitOrchestratorResult {
  isLifecycleOperationPending: boolean
  /** form `onSubmit` handler。若发生权限拒绝/版本冲突/保护失败返回 null。 */
  submit: (data: BOM) => Promise<BOM | null>
  /** 草稿原子保存并发布；历史批准发布及已发布作废走独立状态入口。 */
  promote: (targetStatus: string) => Promise<void>
}

export function useBOMSubmitOrchestrator(
  params: UseBOMSubmitOrchestratorParams
): UseBOMSubmitOrchestratorResult {
  const {
    isEdit,
    currentRow,
    form,
    effectiveProtocolDraft,
    isSidecarDirty,
    permissionGuard,
    optimisticLock,
    deltaTracker,
    onSubmit,
    onPromote,
    onClose,
  } = params
  const lifecycleOperationPendingRef = useRef(false)
  const [isLifecycleOperationPending, setIsLifecycleOperationPending] =
    useState(false)

  /**
   * 由 effectiveProtocolDraft + 当前 form values 组装 SaveBOMInput，
   * 并加上乐观锁字段。包含 sidecarDelta 与否由调用方决定。
   */
  const buildSubmitPayload = useCallback(
    (
      data: BOM,
      fullSidecar: BOMRelationSidecar,
      includeDelta: boolean
    ): SaveBOMInput => {
      const base: SaveBOMInput = {
        ...data,
        relationSidecar: fullSidecar,
        _sidecarDelta: includeDelta ? deltaTracker.commitDelta() : null,
      }
      return optimisticLock.prepareSavePayload(
        base,
        optimisticLock.currentVersion
      )
    },
    [deltaTracker, optimisticLock]
  )

  const submit = useCallback(
    async (data: BOM): Promise<BOM | null> => {
      if (lifecycleOperationPendingRef.current) return null
      // 权限守卫
      if (!permissionGuard.canSave) {
        const reason = permissionGuard.getDenialReason()
        logger.warn('Save blocked', { reason })
        return null
      }

      // 编辑态下若 form 与 sidecar 都没改动，直接关闭弹窗
      if (isEdit && !form.formState.isDirty && !isSidecarDirty) {
        onClose()
        return null
      }

      if (!effectiveProtocolDraft) {
        failLoudly(
          new Error(
            '[CRITICAL] Missing effective BOM relation sidecar protocol draft during save submit'
          ),
          'useBOMSubmitOrchestrator.submit'
        )
        return null
      }

      const fullSidecar = buildBOMRelationSidecar(effectiveProtocolDraft)
      const submitData = buildSubmitPayload(data, fullSidecar, true)

      if (!onSubmit) {
        onClose()
        return null
      }

      const result = await onSubmit(submitData)
      if (!result) return null

      // 版本冲突 → 弹窗已由 useBOMOptimisticLock 内部触发，这里只让调用方知道结果
      const conflict = optimisticLock.validateVersion(
        result.version,
        currentRow?.id ? 1 : 0
      )
      if (conflict) {
        logger.warn('Version conflict detected', conflict)
        return null
      }

      // 成功：更新版本 + 重置 baseline
      optimisticLock.updateVersion(result.version)
      deltaTracker.resetBaseline(fullSidecar)
      return result
    },
    [
      buildSubmitPayload,
      currentRow?.id,
      deltaTracker,
      effectiveProtocolDraft,
      form.formState.isDirty,
      isEdit,
      isSidecarDirty,
      onClose,
      onSubmit,
      optimisticLock,
      permissionGuard,
    ]
  )

  const promote = useCallback(
    async (targetStatus: string): Promise<void> => {
      if (lifecycleOperationPendingRef.current || form.formState.isSubmitting)
        return
      if (!onSubmit && !onPromote) return
      // 权限守卫
      if (!permissionGuard.canPromote) {
        const reason = permissionGuard.getDenialReason()
        logger.warn('Promote blocked', { reason })
        return
      }

      if (!effectiveProtocolDraft) return
      lifecycleOperationPendingRef.current = true
      setIsLifecycleOperationPending(true)
      try {
        // Content and publication commit together. A failed release must not leave a
        // new draft or save edits that the user intended to publish.
        if (targetStatus === 'RELEASED' && permissionGuard.canSave) {
          if (!onSubmit) return

          let currentData: BOM | undefined
          await form.handleSubmit((validatedData) => {
            currentData = validatedData
          })()
          if (!currentData) return

          const fullSidecar = buildBOMRelationSidecar(effectiveProtocolDraft)
          const saved = await onSubmit({
            ...buildSubmitPayload(currentData, fullSidecar, true),
            publishOnSave: true,
          })
          if (!saved) return

          const conflict = optimisticLock.validateVersion(
            saved.version,
            currentRow?.id ? 2 : 1
          )
          if (conflict) {
            logger.warn('Version conflict during promote', conflict)
            return
          }
          optimisticLock.updateVersion(saved.version)
          deltaTracker.resetBaseline(fullSidecar)
          onClose()
          return
        }

        // Historical approved records and released records stay read-only.
        if (currentRow?.id && onPromote) {
          const success = await onPromote(
            currentRow.id,
            targetStatus,
            currentRow.version
          )
          if (success) {
            onClose()
          }
        }
      } finally {
        lifecycleOperationPendingRef.current = false
        setIsLifecycleOperationPending(false)
      }
    },
    [
      buildSubmitPayload,
      currentRow,
      deltaTracker,
      effectiveProtocolDraft,
      form,
      onClose,
      onPromote,
      onSubmit,
      optimisticLock,
      permissionGuard,
    ]
  )

  return { submit, promote, isLifecycleOperationPending }
}
