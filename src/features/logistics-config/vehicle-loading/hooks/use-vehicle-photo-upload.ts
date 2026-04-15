import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { AssetService } from '@/services/asset-service'
import { vehicleLoadingQueryKeys } from '../query-keys'
import { saveVehiclePhoto, type SaveVehiclePhotoInput } from '../services/vehicle-photo-service'

export type UploadVehiclePhotoPayload = {
  vehicleId: string
  file: File
} & Omit<SaveVehiclePhotoInput, 'url'>

export function useVehiclePhotoUpload() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ vehicleId, file, ...payload }: UploadVehiclePhotoPayload) => {
      const uploaded = await AssetService.uploadFile(file)
      return saveVehiclePhoto(vehicleId, {
        ...payload,
        url: uploaded.url,
        alt: payload.alt ?? file.name,
      })
    },
    onSuccess: async () => {
      toast.success(t('logisticsConfig.vehiclePhotos.toasts.uploadSuccess'))
      await queryClient.invalidateQueries({ queryKey: vehicleLoadingQueryKeys.specs() })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(t('logisticsConfig.vehiclePhotos.toasts.uploadFailed', { message }))
    },
  })
}
