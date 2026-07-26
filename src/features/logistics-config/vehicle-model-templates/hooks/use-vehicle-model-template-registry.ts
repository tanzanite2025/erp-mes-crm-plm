import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { vehicleModelTemplateQueryKeys } from '../query-keys'
import {
  getVehicleModelTemplates,
  getVehicleModelTemplateVersions,
  restoreVehicleModelTemplateVersion,
  saveVehicleModelTemplate,
  type SaveVehicleModelTemplateInput,
} from '../services/vehicle-model-template-service'

type Options = {
  enabled?: boolean
}

export function useVehicleModelTemplateVersionHistory(templateId?: string) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const versionsQuery = useQuery({
    queryKey: vehicleModelTemplateQueryKeys.versions(templateId),
    queryFn: () => getVehicleModelTemplateVersions(templateId ?? ''),
    enabled: Boolean(templateId),
  })

  const restoreMutation = useMutation({
    mutationFn: (version: number) => {
      if (!templateId) {
        throw new Error('Template id is required')
      }
      return restoreVehicleModelTemplateVersion(templateId, version)
    },
    onSuccess: async () => {
      toast.success(
        t('logisticsConfig.vehicleModelTemplates.toasts.restoreSuccess')
      )
      await queryClient.invalidateQueries({
        queryKey: vehicleModelTemplateQueryKeys.all,
      })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(
        t('logisticsConfig.vehicleModelTemplates.toasts.restoreFailed', {
          message,
        })
      )
    },
  })

  return {
    versions: versionsQuery.data ?? [],
    isLoadingVersions: versionsQuery.isLoading,
    versionsError: versionsQuery.error,
    restoreMutation,
  }
}

export function useVehicleModelTemplateRegistry(
  seedVehicleSpecId?: string,
  options: Options = {}
) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const templatesQuery = useQuery({
    queryKey: vehicleModelTemplateQueryKeys.list(seedVehicleSpecId),
    queryFn: () => getVehicleModelTemplates(seedVehicleSpecId),
    enabled: options.enabled ?? Boolean(seedVehicleSpecId),
  })

  const saveMutation = useMutation({
    mutationFn: (input: SaveVehicleModelTemplateInput) =>
      saveVehicleModelTemplate(input),
    onSuccess: async () => {
      toast.success(
        t('logisticsConfig.vehicleModelTemplates.toasts.saveSuccess')
      )
      await queryClient.invalidateQueries({
        queryKey: vehicleModelTemplateQueryKeys.all,
      })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(
        t('logisticsConfig.vehicleModelTemplates.toasts.saveFailed', {
          message,
        })
      )
    },
  })

  return {
    templates: templatesQuery.data ?? [],
    isLoadingTemplates: templatesQuery.isLoading,
    templatesError: templatesQuery.error,
    reloadTemplates: templatesQuery.refetch,
    saveMutation,
  }
}
