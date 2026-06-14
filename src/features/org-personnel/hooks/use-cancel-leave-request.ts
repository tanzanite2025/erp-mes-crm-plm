import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { personnelQueryKeys } from '../query-keys'
import { LeaveService } from '../services/leave-service'

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient()

  const cancelMutation = useMutation({
    mutationFn: async (leaveId: string) => {
      await LeaveService.cancelLeaveRequest(leaveId)
      return leaveId
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: personnelQueryKeys.leaves.list(),
        }),
        queryClient.invalidateQueries({
          queryKey: personnelQueryKeys.leaves.stats(),
        }),
      ])
      toast.success('请假申请已撤销')
    },
    onError: (error: Error) => {
      toast.error(error.message || '撤销请假申请失败')
    },
  })

  return {
    cancelLeaveRequest: cancelMutation.mutateAsync,
    isCanceling: cancelMutation.isPending,
    cancelingLeaveId: cancelMutation.variables ?? null,
  }
}
