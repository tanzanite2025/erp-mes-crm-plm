import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
        queryClient.invalidateQueries({ queryKey: ['personnel', 'leaves', 'my'] }),
        queryClient.invalidateQueries({ queryKey: ['personnel', 'leaves', 'stats', 'my'] }),
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
