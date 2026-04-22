import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { ENGINEERING_DB_WEAVING_MODES_QUERY_KEY } from '../query-keys'
import { type WeavingMode, type WeavingModeDraft } from '../data/weaving-mode-schema'
import { weavingModeService } from '../services/weaving-mode-service'

export function useWeavingModeQueryState() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const presetInitAttemptedRef = useRef(false)
  const [presetInitRetrySignal, setPresetInitRetrySignal] = useState(0)

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ENGINEERING_DB_WEAVING_MODES_QUERY_KEY,
    queryFn: () => weavingModeService.getWeavingModes(),
  })

  const ensurePresetMutation = useMutation({
    mutationFn: () => weavingModeService.ensureWeavingModePresets(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_WEAVING_MODES_QUERY_KEY })
    },
    onError: () => {
      toast.error('系统预置编织方式初始化失败')
    },
  })

  const { mutateAsync: ensurePresetMutateAsync, isPending: isEnsuringPresets } = ensurePresetMutation

  useEffect(() => {
    if (!isError && data.length === 0 && !presetInitAttemptedRef.current && !isEnsuringPresets) {
      presetInitAttemptedRef.current = true
      void ensurePresetMutateAsync()
    }
  }, [data.length, ensurePresetMutateAsync, isEnsuringPresets, isError, presetInitRetrySignal])

  const saveMutation = useMutation({
    mutationFn: (draft: WeavingModeDraft) => weavingModeService.saveWeavingMode(draft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_WEAVING_MODES_QUERY_KEY })
      toast.success(t('engineering.masterData.weavingMode.toasts.saveSuccess'))
    },
    onError: (error) => {
      const message = error instanceof Error && (
        error.message === 'Duplicated weaving mode' ||
        error.message.includes('duplicate normalized ratio key')
      )
        ? t('engineering.masterData.weavingMode.toasts.duplicate')
        : t('engineering.masterData.weavingMode.toasts.saveFailed')
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (item: WeavingMode) => weavingModeService.deleteWeavingMode(item),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_WEAVING_MODES_QUERY_KEY })
      toast.success(t('engineering.masterData.weavingMode.toasts.deleteSuccess'))
    },
    onError: (error) => {
      const message = error instanceof Error
        ? error.message === 'System preset weaving mode cannot be deleted'
          ? t('engineering.masterData.weavingMode.toasts.presetDeleteBlocked')
          : error.message.includes('linked by drilling plan')
            ? '该编织方式已被打孔方案引用，暂不允许删除'
            : t('engineering.masterData.weavingMode.toasts.deleteFailed')
        : t('engineering.masterData.weavingMode.toasts.deleteFailed')
      toast.error(message)
    },
  })

  return {
    data,
    isLoading: isLoading || isEnsuringPresets,
    isLoadError: isError,
    refetchWeavingModes: () => {
      presetInitAttemptedRef.current = false
      setPresetInitRetrySignal((current) => current + 1)
      return refetch()
    },
    saveWeavingMode: (draft: WeavingModeDraft) => saveMutation.mutateAsync(draft),
    deleteWeavingMode: (item: WeavingMode) => deleteMutation.mutateAsync(item),
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
