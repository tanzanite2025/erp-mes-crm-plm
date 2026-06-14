'use client'

import { useCallback } from 'react'
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
 *   - promote 前的"如有未保存改动先 save"流程
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
  /** form `onSubmit` handler。若发生权限拒绝/版本冲突/保护失败返回 null。 */
  submit: (data: BOM) => Promise<BOM | null>
  /** "提升状态"的 dispatch handler。如果当前 form 是 dirty 会先走 submit。 */
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
      const conflict = optimisticLock.validateVersion(result.version)
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
      // 权限守卫
      if (!permissionGuard.canPromote) {
        const reason = permissionGuard.getDenialReason()
        logger.warn('Promote blocked', { reason })
        return
      }

      if (!effectiveProtocolDraft) return

      let bomToPromote = currentRow

      // 若 form dirty 或者还没保存过，先走 save
      if (!bomToPromote?.id || form.formState.isDirty) {
        if (!onSubmit) return

        const fullSidecar = buildBOMRelationSidecar(effectiveProtocolDraft)
        const currentData = form.getValues()
        // promote 前的预 save 不走 sidecarDelta（避免 promote 与保存的 delta 混淆）
        const submitData = buildSubmitPayload(currentData, fullSidecar, false)

        const saved = await onSubmit(submitData)
        if (!saved) return

        const conflict = optimisticLock.validateVersion(saved.version)
        if (conflict) {
          logger.warn('Version conflict during promote', conflict)
          return
        }
        optimisticLock.updateVersion(saved.version)
        bomToPromote = saved
      }

      if (bomToPromote?.id && onPromote) {
        const success = await onPromote(
          bomToPromote.id,
          targetStatus,
          bomToPromote.version
        )
        if (success) {
          onClose()
        }
      }
    },
    [
      buildSubmitPayload,
      currentRow,
      effectiveProtocolDraft,
      form,
      onClose,
      onPromote,
      onSubmit,
      optimisticLock,
      permissionGuard,
    ]
  )

  return { submit, promote }
}
