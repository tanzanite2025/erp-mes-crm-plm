import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import type { BOM } from '../data/schema'
import { type SaveBOMInput } from '../mutation-types'
import { BOMS_QUERY_KEY } from '../query-keys'
import type { BomEngineeringSemanticAction } from '../services/bom-routing-event-factory'
import {
  dispatchBomEngineeringRoutingEvent,
  dispatchBomManufacturingRoutingEvent,
} from '../services/bom-routing-service'
import { bomService } from '../services/bom-service'
import { isEBOM } from '../utils/bom-identity'
import { bomVersionTraceQueryKeys } from '../version-trace/query-keys'

const logger = createLogger('useBOMWriteActions')

/**
 * 由 status 推导 EBOM 的 semantic action。
 *
 * 业务上 EBOM 的状态转移可能是用户主动选择的，但在 hook 层我们没有显式
 * 的 semantic 信号。这里按 (prev → next) 的最常见路径反推：
 *   DRAFT     → REVIEWING : SUBMITTED_FOR_REVIEW
 *   REVIEWING → APPROVED  : APPROVED
 *   REVIEWING → DRAFT     : REJECTED
 *   APPROVED  → RELEASED  : RELEASED
 *   *         → OBSOLETE  : OBSOLETED
 * 其它情形回退为 undefined（不派发事件）。
 */
function deriveEbomSemanticAction(
  prevStatus: BOM['status'] | undefined,
  nextStatus: BOM['status']
): BomEngineeringSemanticAction | undefined {
  if (nextStatus === 'OBSOLETE') return 'OBSOLETED'
  if (!prevStatus) return undefined
  if (prevStatus === 'DRAFT' && nextStatus === 'REVIEWING') {
    return 'SUBMITTED_FOR_REVIEW'
  }
  if (prevStatus === 'REVIEWING' && nextStatus === 'APPROVED') {
    return 'APPROVED'
  }
  if (prevStatus === 'REVIEWING' && nextStatus === 'DRAFT') {
    return 'REJECTED'
  }
  if (prevStatus === 'APPROVED' && nextStatus === 'RELEASED') {
    return 'RELEASED'
  }
  return undefined
}

export function useBOMWriteActions() {
  const queryClient = useQueryClient()

  const saveBOMMutation = useMutation({
    mutationFn: (params: { data: SaveBOMInput; previousBom?: BOM }) =>
      bomService.saveBOM(params),
    onSuccess: async (saved, variables) => {
      await queryClient.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
      await queryClient.invalidateQueries({
        queryKey: bomVersionTraceQueryKeys.root(),
      })

      toast.success('BOM 已保存')

      // 仅在新建（previousBom 不存在）且为 EBOM 时派发 CREATED 事件
      if (!variables.previousBom && isEBOM(saved)) {
        try {
          await dispatchBomEngineeringRoutingEvent({
            bom: saved,
            semanticAction: 'CREATED',
          })
        } catch (error) {
          logger.warn('Failed to dispatch EBOM CREATED event', {
            bomId: saved.id,
            error,
          })
        }
      }
    },
    onError: (error: Error) => {
      // 处理并发冲突错误
      if (
        error.message.includes('CONFLICT') ||
        error.message.includes('modified by another user')
      ) {
        toast.error('保存失败：BOM已被其他用户修改，请刷新后重试')
        // 强制刷新数据
        queryClient.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
      } else if (error.message.includes('locked')) {
        toast.error('保存失败：BOM已被锁定，无法修改')
      } else {
        toast.error(`保存失败：${error.message}`)
      }
    },
  })

  const deleteBOMMutation = useMutation({
    mutationFn: (params: { id: string; previousBom?: BOM }) =>
      bomService.deleteBOM(params.id),
    onSuccess: async (_void, variables) => {
      await queryClient.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
      await queryClient.invalidateQueries({
        queryKey: bomVersionTraceQueryKeys.root(),
      })

      toast.success('BOM 已删除')

      const previousBom = variables.previousBom
      if (!previousBom) return
      try {
        if (isEBOM(previousBom)) {
          await dispatchBomEngineeringRoutingEvent({
            bom: { ...previousBom, status: 'OBSOLETE' },
            semanticAction: 'OBSOLETED',
            previousStatus: previousBom.status,
          })
        } else {
          await dispatchBomManufacturingRoutingEvent({
            bom: { ...previousBom, status: 'OBSOLETE' },
            semanticAction: 'OBSOLETED',
          })
        }
      } catch (error) {
        logger.warn('Failed to dispatch BOM OBSOLETED event on delete', {
          bomId: previousBom.id,
          error,
        })
      }
    },
    onError: (error: Error) => {
      if (error.message.includes('locked')) {
        toast.error('删除失败：BOM已被锁定，无法删除')
      } else if (error.message.includes('referenced')) {
        toast.error('删除失败：该EBOM已被MBOM引用，无法删除')
      } else {
        toast.error(`删除失败：${error.message}`)
      }
    },
  })

  const promoteBOMMutation = useMutation({
    mutationFn: (params: {
      id: string
      status: string
      expectedVersion?: number
      reason?: string
      approverComment?: string
      previousBom?: BOM
    }) =>
      bomService.promoteBOMStatus(
        params.id,
        params.status,
        params.expectedVersion,
        params.reason,
        params.approverComment
      ),
    onSuccess: async (saved, variables) => {
      await queryClient.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
      await queryClient.invalidateQueries({
        queryKey: bomVersionTraceQueryKeys.root(),
      })

      // 仅 EBOM 走完整审批/发布流程；MBOM 在派生时走 CREATED_FROM_EBOM
      if (!isEBOM(saved)) return

      const previousStatus = variables.previousBom?.status
      const semanticAction = deriveEbomSemanticAction(
        previousStatus,
        saved.status
      )
      if (!semanticAction) return

      try {
        await dispatchBomEngineeringRoutingEvent({
          bom: saved,
          semanticAction,
          previousStatus,
          reason: variables.reason,
          approverComment: variables.approverComment,
        })
      } catch (error) {
        logger.warn('Failed to dispatch EBOM status event', {
          bomId: saved.id,
          error,
        })
      }
    },
    onError: (error: Error, variables) => {
      // 处理状态转换错误
      if (
        error.message.includes('CONFLICT') ||
        error.message.includes('modified by another user')
      ) {
        toast.error('状态流转失败：BOM已被其他用户修改，请刷新后重试')
        queryClient.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
      } else if (error.message.includes('locked')) {
        toast.error('状态流转失败：BOM已被锁定')
      } else if (
        error.message.includes('FORBIDDEN') ||
        error.message.includes('permission')
      ) {
        toast.error('状态流转失败：您没有执行此操作的权限')
      } else if (
        error.message.includes('transition') ||
        error.message.includes('cannot')
      ) {
        toast.error(`状态流转失败：不允许从当前状态转换到 ${variables.status}`)
      } else {
        toast.error(`状态流转失败：${error.message}`)
      }
    },
  })

  const deriveMBOMMutation = useMutation({
    mutationFn: (params: {
      ebomId: string
      input: {
        description?: string
        revisionNo?: string
        changeOrderNo?: string
      }
      sourceEbom?: BOM
    }) => bomService.deriveMBOMFromEBOM(params.ebomId, params.input),
    onSuccess: async (newMbom, variables) => {
      await queryClient.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
      await queryClient.invalidateQueries({
        queryKey: bomVersionTraceQueryKeys.root(),
      })
      toast.success('MBOM派生成功')

      const sourceEbom = variables.sourceEbom
      // MBOM 一侧：CREATED_FROM_EBOM
      try {
        await dispatchBomManufacturingRoutingEvent({
          bom: newMbom,
          semanticAction: 'CREATED_FROM_EBOM',
          sourceEbomNo: sourceEbom?.bomNo,
          sourceEbomVersion: sourceEbom?.bomVersion,
        })
      } catch (error) {
        logger.warn('Failed to dispatch MBOM CREATED_FROM_EBOM event', {
          mbomId: newMbom.id,
          error,
        })
      }

      // EBOM 一侧：DERIVED（被派生通知）
      if (sourceEbom) {
        try {
          await dispatchBomEngineeringRoutingEvent({
            bom: sourceEbom,
            semanticAction: 'DERIVED',
            derivedMbomId: newMbom.id,
          })
        } catch (error) {
          logger.warn('Failed to dispatch EBOM DERIVED event', {
            ebomId: sourceEbom.id,
            mbomId: newMbom.id,
            error,
          })
        }
      }
    },
    onError: (error: Error) => {
      if (error.message.includes('not found')) {
        toast.error('派生失败：源EBOM不存在')
      } else if (error.message.includes('must be EBOM')) {
        toast.error('派生失败：只能从EBOM派生MBOM')
      } else if (
        error.message.includes('RELEASED') ||
        error.message.includes('released')
      ) {
        toast.error('派生失败：只能从已发布(RELEASED)的EBOM派生MBOM')
      } else if (error.message.includes('locked')) {
        toast.error('派生失败：源EBOM必须处于锁定状态')
      } else {
        toast.error(`派生失败：${error.message}`)
      }
    },
  })

  const reviseMBOMMutation = useMutation({
    mutationFn: (params: {
      mbomId: string
      input: {
        reason: string
        changeOrderNo?: string
        revisionNo?: string
        expectedVersion?: number
      }
      previousMbom?: BOM
    }) => bomService.reviseMBOM(params.mbomId, params.input),
    onSuccess: async (newMbom, variables) => {
      await queryClient.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
      await queryClient.invalidateQueries({
        queryKey: bomVersionTraceQueryKeys.root(),
      })
      toast.success('MBOM 修订成功，已产生新版本')

      const previousMbom = variables.previousMbom
      // 新 MBOM 一侧：REVISED
      try {
        await dispatchBomManufacturingRoutingEvent({
          bom: newMbom,
          semanticAction: 'REVISED',
          previousVersion: previousMbom?.bomVersion,
          reason: variables.input.reason,
        })
      } catch (error) {
        logger.warn('Failed to dispatch MBOM REVISED event', {
          mbomId: newMbom.id,
          error,
        })
      }

      // 旧 MBOM 一侧：OBSOLETED
      if (previousMbom) {
        try {
          await dispatchBomManufacturingRoutingEvent({
            bom: { ...previousMbom, status: 'OBSOLETE' },
            semanticAction: 'OBSOLETED',
            reason: `已被新版本 ${newMbom.bomVersion} 替换：${variables.input.reason}`,
          })
        } catch (error) {
          logger.warn('Failed to dispatch old MBOM OBSOLETED event on revise', {
            mbomId: previousMbom.id,
            error,
          })
        }
      }
    },
    onError: (error: Error) => {
      if (
        error.message.includes('CONFLICT') ||
        error.message.includes('modified by another user')
      ) {
        toast.error('修订失败：MBOM 已被其他用户修改，请刷新后重试')
        queryClient.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
      } else if (error.message.includes('only RELEASED MBOM')) {
        toast.error('修订失败：仅生效中的 MBOM 可以提交修订')
      } else if (error.message.includes('reason is required')) {
        toast.error('修订失败：必须填写修订原因')
      } else if (error.message.includes('revise target must be MBOM')) {
        toast.error('修订失败：只有生产 BOM 可以修订')
      } else {
        toast.error(`修订失败：${error.message}`)
      }
    },
  })

  return {
    saveBOM: saveBOMMutation.mutateAsync,
    deleteBOM: deleteBOMMutation.mutateAsync,
    promoteBOM: promoteBOMMutation.mutateAsync,
    deriveMBOM: deriveMBOMMutation.mutateAsync,
    reviseMBOM: reviseMBOMMutation.mutateAsync,
    isSavingBOM: saveBOMMutation.isPending,
    isDeletingBOM: deleteBOMMutation.isPending,
    isPromotingBOM: promoteBOMMutation.isPending,
    isDerivingMBOM: deriveMBOMMutation.isPending,
    isRevisingMBOM: reviseMBOMMutation.isPending,
  }
}
