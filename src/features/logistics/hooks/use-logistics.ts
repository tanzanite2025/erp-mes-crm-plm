import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { buildMutationOptions } from '@/lib/react-query-mutation'
import { isConflictError } from '@/lib/handle-server-error'
import { toUpdateLogisticsStatusApiDTO } from '../adapters/logistics-api-adapter'
import type { LogisticsEvent, LogisticsRecord, SaveLogisticsRecordInput, UpdateLogisticsStatusInput } from '../data/schema'
import { logisticsService } from '../services/logistics-service'
import { type DeltaSet } from '@/lib/delta/types'

interface PatchLogisticsRecordInput {
  id: string
  version: number
  delta: DeltaSet
}

interface SaveLogisticsMutationInput {
  mode: 'create' | 'patch'
  createInput?: SaveLogisticsRecordInput
  patchInput?: PatchLogisticsRecordInput
}

interface UpdateLogisticsStatusMutationInput extends UpdateLogisticsStatusInput {
  currentVersion: number
  currentEvents: LogisticsEvent[]
}

export const LOGISTICS_KEYS = {
  all: ['logistics'] as const,
  list: () => [...LOGISTICS_KEYS.all, 'list'] as const,
  detail: (id: string) => [...LOGISTICS_KEYS.all, 'detail', id] as const,
  byOrder: (orderNo: string) => [...LOGISTICS_KEYS.all, 'by-order', orderNo] as const,
}

export function useGetLogistics(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: [...LOGISTICS_KEYS.list(), page, pageSize],
    queryFn: () => logisticsService.getRecords(page, pageSize),
  })
}

export function useGetLogisticsDetail(id: string | undefined) {
  return useQuery({
    queryKey: LOGISTICS_KEYS.detail(id || ''),
    queryFn: () => (id ? logisticsService.getRecordById(id) : null),
    enabled: !!id,
  })
}

export function useLogisticsMutations() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: (input: SaveLogisticsMutationInput) => {
      if (input.mode === 'patch' && input.patchInput) {
        return logisticsService.patchLogistics(input.patchInput.id, input.patchInput.delta, input.patchInput.version)
      }

      if (input.mode === 'create' && input.createInput) {
        return logisticsService.saveRecord(input.createInput)
      }

      throw new Error('[CRITICAL] Invalid logistics save mutation input')
    },
    ...buildMutationOptions<LogisticsRecord, Error, SaveLogisticsMutationInput>({
      queryClient,
      invalidateQueryKeys: [LOGISTICS_KEYS.all],
      onSuccess: () => {
        toast.success(t('trading.logistics.toasts.saveSuccess'))
      },
    }),
    onError: (err: Error) => {
      if (isConflictError(err)) {
        toast.error(t('trading.logistics.toasts.conflict'))
        return
      }
      toast.error(t('trading.logistics.toasts.saveFailed', { message: err.message }))
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: (input: UpdateLogisticsStatusMutationInput) =>
      logisticsService.updateStatus(
        input.id,
        toUpdateLogisticsStatusApiDTO(input, input.currentVersion, input.currentEvents)
      ),
    ...buildMutationOptions<LogisticsRecord, Error, UpdateLogisticsStatusMutationInput>({
      queryClient,
      invalidateQueryKeys: [LOGISTICS_KEYS.all],
      onSuccess: () => {
        toast.success(t('trading.logistics.toasts.updateStatusSuccess'))
      },
    }),
    onError: (err: Error) => {
      toast.error(t('trading.logistics.toasts.updateStatusFailed', { message: err.message }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => logisticsService.deleteRecord(id),
    ...buildMutationOptions<void, Error, string>({
      queryClient,
      invalidateQueryKeys: [LOGISTICS_KEYS.all],
      onSuccess: () => {
        toast.success(t('trading.logistics.toasts.deleteSuccess'))
      },
    }),
    onError: (err: Error) => {
      toast.error(t('trading.logistics.toasts.deleteFailed', { message: err.message }))
    },
  })

  return {
    saveMutation,
    updateStatusMutation,
    deleteMutation,
  }
}
