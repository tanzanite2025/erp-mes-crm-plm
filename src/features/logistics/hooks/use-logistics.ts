import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { buildMutationOptions } from '@/lib/react-query-mutation'
import { isConflictError } from '@/lib/handle-server-error'
import { logisticsService } from '../services/logistics-service'
import { type LogisticsRecord, type LogisticsStatus } from '../types'

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
    mutationFn: (data: Partial<LogisticsRecord>) => logisticsService.saveRecord(data),
    ...buildMutationOptions<LogisticsRecord, Error, Partial<LogisticsRecord>>({
      queryClient,
      invalidateQueryKeys: [LOGISTICS_KEYS.all],
      successMessage: t('trading.logistics.toasts.saveSuccess'),
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
    mutationFn: ({
      id,
      status,
      location,
      description,
    }: {
      id: string
      status: LogisticsStatus
      location: string
      description: string
    }) => logisticsService.updateStatus(id, status, location, description),
    ...buildMutationOptions<
      LogisticsRecord,
      Error,
      { id: string; status: LogisticsStatus; location: string; description: string }
    >({
      queryClient,
      invalidateQueryKeys: [LOGISTICS_KEYS.all],
      successMessage: t('trading.logistics.toasts.updateStatusSuccess'),
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
      successMessage: t('trading.logistics.toasts.deleteSuccess'),
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
