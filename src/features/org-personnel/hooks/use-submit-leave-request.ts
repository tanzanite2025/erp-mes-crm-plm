import { useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { LeaveService, type LeaveRequestPreviewResult } from '../services/leave-service'
import type { LeaveCreateForm } from '../data/leave-request-schema'
import { personnelQueryKeys } from '../query-keys'

export function useSubmitLeaveRequest(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const [preview, setPreview] = useState<LeaveRequestPreviewResult | null>(null)
  const resetPreview = useCallback(() => {
    setPreview(null)
  }, [])

  const hasSelectedEmployee = useCallback((employeeId?: string) => Boolean(employeeId?.trim()), [])

  const previewMutation = useMutation({
    mutationFn: async (values: LeaveCreateForm) => {
      return LeaveService.previewLeaveRequest({
        employeeId: values.employeeId,
        leaveType: values.leaveType,
        startTime: values.startTime,
        endTime: values.endTime,
      })
    },
    onSuccess: (result) => {
      setPreview(result)
      toast.success(`后端已试算 ${result.durationDays.toFixed(1)} 天`)
    },
    onError: (error: Error) => {
      toast.error(error.message || '请假试算失败')
    },
  })

  const submitMutation = useMutation({
    mutationFn: async (values: LeaveCreateForm) => {
      const nextPreview = await LeaveService.previewLeaveRequest({
        employeeId: values.employeeId,
        leaveType: values.leaveType,
        startTime: values.startTime,
        endTime: values.endTime,
      })
      setPreview(nextPreview)
      return LeaveService.submitLeaveRequest({
        employeeId: values.employeeId,
        leaveType: values.leaveType,
        startTime: values.startTime,
        endTime: values.endTime,
        reason: values.reason,
      })
    },
    onSuccess: async () => {
      setPreview(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: personnelQueryKeys.leaves.list() }),
        queryClient.invalidateQueries({ queryKey: personnelQueryKeys.leaves.stats() }),
      ])
      toast.success('请假申请已提交')
      onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(error.message || '请假申请提交失败')
    },
  })

  return {
    hasSelectedEmployee,
    preview,
    isPreviewing: previewMutation.isPending,
    isSubmitting: submitMutation.isPending,
    previewLeaveRequest: previewMutation.mutateAsync,
    submitLeaveRequest: submitMutation.mutateAsync,
    resetPreview,
  }
}
