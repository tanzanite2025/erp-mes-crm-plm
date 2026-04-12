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
        queryClient.invalidateQueries({ queryKey: personnelQueryKeys.leaves.my() }),
        queryClient.invalidateQueries({ queryKey: personnelQueryKeys.leaves.statsMy() }),
      ])
      toast.success('璇峰亣鐢宠宸叉挙閿€')
    },
    onError: (error: Error) => {
      toast.error(error.message || '鎾ら攢璇峰亣鐢宠澶辫触')
    },
  })

  return {
    cancelLeaveRequest: cancelMutation.mutateAsync,
    isCanceling: cancelMutation.isPending,
    cancelingLeaveId: cancelMutation.variables ?? null,
  }
}
