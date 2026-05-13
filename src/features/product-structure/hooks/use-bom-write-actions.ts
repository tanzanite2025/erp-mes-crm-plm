import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type SaveBOMInput } from '../mutation-types'
import { BOMS_QUERY_KEY } from '../query-keys'
import { bomVersionTraceQueryKeys } from '../version-trace/query-keys'
import { bomService } from '../services/bom-service'

export function useBOMWriteActions() {
  const queryClient = useQueryClient()

  const saveBOMMutation = useMutation({
    mutationFn: (params: { data: SaveBOMInput }) =>
      bomService.saveBOM(params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: bomVersionTraceQueryKeys.root() })
    },
    onError: (error: Error) => {
      // 处理并发冲突错误
      if (error.message.includes('CONFLICT') || error.message.includes('modified by another user')) {
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
    mutationFn: (id: string) => bomService.deleteBOM(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: bomVersionTraceQueryKeys.root() })
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
    }) => 
      bomService.promoteBOMStatus(
        params.id, 
        params.status, 
        params.expectedVersion,
        params.reason,
        params.approverComment
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: bomVersionTraceQueryKeys.root() })
    },
    onError: (error: Error, variables) => {
      // 处理状态转换错误
      if (error.message.includes('CONFLICT') || error.message.includes('modified by another user')) {
        toast.error('状态流转失败：BOM已被其他用户修改，请刷新后重试')
        queryClient.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
      } else if (error.message.includes('locked')) {
        toast.error('状态流转失败：BOM已被锁定')
      } else if (error.message.includes('FORBIDDEN') || error.message.includes('permission')) {
        toast.error('状态流转失败：您没有执行此操作的权限')
      } else if (error.message.includes('transition') || error.message.includes('cannot')) {
        toast.error(`状态流转失败：不允许从当前状态转换到 ${variables.status}`)
      } else {
        toast.error(`状态流转失败：${error.message}`)
      }
    },
  })

  const deriveMBOMMutation = useMutation({
    mutationFn: (params: { ebomId: string, input: { description?: string; revisionNo?: string; changeOrderNo?: string } }) =>
      bomService.deriveMBOMFromEBOM(params.ebomId, params.input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: bomVersionTraceQueryKeys.root() })
      toast.success('MBOM派生成功')
    },
    onError: (error: Error) => {
      if (error.message.includes('not found')) {
        toast.error('派生失败：源EBOM不存在')
      } else if (error.message.includes('must be EBOM')) {
        toast.error('派生失败：只能从EBOM派生MBOM')
      } else if (error.message.includes('RELEASED') || error.message.includes('released')) {
        toast.error('派生失败：只能从已发布(RELEASED)的EBOM派生MBOM')
      } else if (error.message.includes('locked')) {
        toast.error('派生失败：源EBOM必须处于锁定状态')
      } else {
        toast.error(`派生失败：${error.message}`)
      }
    },
  })

  return {
    saveBOM: saveBOMMutation.mutateAsync,
    deleteBOM: deleteBOMMutation.mutateAsync,
    promoteBOM: promoteBOMMutation.mutateAsync,
    deriveMBOM: deriveMBOMMutation.mutateAsync,
    isSavingBOM: saveBOMMutation.isPending,
    isDeletingBOM: deleteBOMMutation.isPending,
    isPromotingBOM: promoteBOMMutation.isPending,
    isDerivingMBOM: deriveMBOMMutation.isPending,
  }
}
