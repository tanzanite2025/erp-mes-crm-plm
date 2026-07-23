import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { cuttingEngineConfigService } from './cutting-engine-config-service'
import { CUTTING_ENGINE_CONFIG_QUERY_KEY } from './query-keys'
import {
  DEFAULT_CUTTING_ENGINE_CONFIG,
  type CuttingEngineConfig,
} from './types'
import { useCuttingEngineConfigStore } from './use-cutting-engine-config-store'

type SaveCuttingEngineConfigRequest = {
  config: CuttingEngineConfig
  successMessageKey:
    | 'rawMaterials.engineConfig.toasts.saveSuccess'
    | 'rawMaterials.engineConfig.toasts.reset'
  successTone: 'success' | 'info'
}

export function useCuttingEngineConfigQueryState() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const config = useCuttingEngineConfigStore((state) => state.config)
  const revision = useCuttingEngineConfigStore((state) => state.revision)
  const applyConfig = useCuttingEngineConfigStore((state) => state.applyConfig)

  const configQuery = useQuery({
    queryKey: CUTTING_ENGINE_CONFIG_QUERY_KEY,
    queryFn: () => cuttingEngineConfigService.getConfig(),
  })

  useEffect(() => {
    if (configQuery.data) {
      applyConfig(configQuery.data)
    }
  }, [applyConfig, configQuery.data])

  const saveMutation = useMutation({
    mutationFn: (request: SaveCuttingEngineConfigRequest) =>
      cuttingEngineConfigService.updateConfig(request.config),
    onSuccess: (saved, request) => {
      applyConfig(saved)
      queryClient.setQueryData(CUTTING_ENGINE_CONFIG_QUERY_KEY, saved)
      const message = t(request.successMessageKey)
      if (request.successTone === 'info') {
        toast.info(message)
      } else {
        toast.success(message)
      }
    },
    onError: () => {
      toast.error(t('rawMaterials.engineConfig.toasts.saveFailed'))
    },
  })

  return {
    config,
    revision,
    isLoading: configQuery.isLoading && !configQuery.data,
    isLoadError: configQuery.isError && !configQuery.data,
    loadError: configQuery.error,
    refetchConfig: configQuery.refetch,
    saveConfig: (nextConfig: CuttingEngineConfig) =>
      saveMutation.mutateAsync({
        config: nextConfig,
        successMessageKey: 'rawMaterials.engineConfig.toasts.saveSuccess',
        successTone: 'success',
      }),
    resetConfig: () =>
      saveMutation.mutateAsync({
        config: DEFAULT_CUTTING_ENGINE_CONFIG,
        successMessageKey: 'rawMaterials.engineConfig.toasts.reset',
        successTone: 'info',
      }),
    isSaving: saveMutation.isPending,
  }
}
