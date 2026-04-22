import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { toLogisticsProviderDraft } from '@/features/sandbox/logistics-api/adapters/logistics-provider-adapter'
import {
  isLogisticsProviderCredentialsComplete,
  isLogisticsProviderDraftValid,
} from '@/features/sandbox/logistics-api/data/logistics-provider-rules'
import {
  applyLogisticsTemplate,
  createEmptyLogisticsProvider,
  findDuplicateProvider,
  getProviderCategory,
  getProviderVerificationSummaryKey,
  getProviderVerificationStatus,
  isProviderApiConnected,
  logisticsProviderQueryKey,
} from '@/features/logistics-config/provider-directory'
import { logisticsProviderService } from '@/features/sandbox/logistics-api/services/logistics-provider-service'
import { LOGISTICS_TEMPLATES, type LogisticsProvider, type LogisticsProviderDraft } from '@/features/sandbox/logistics-api/types'

export function useLogisticsPlatformAdmin() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState<LogisticsProviderDraft>(createEmptyLogisticsProvider())
  const [selectedNote, setSelectedNote] = useState('')

  const {
    data: providers = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: logisticsProviderQueryKey,
    queryFn: () => logisticsProviderService.getProviders(),
  })

  const saveMutation = useMutation({
    mutationFn: (provider: LogisticsProviderDraft) => logisticsProviderService.saveProvider(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logisticsProviderQueryKey })
      toast.success(t('logisticsConfig.platforms.toasts.saveSuccess'))
      setIsDialogOpen(false)
      setFormData(createEmptyLogisticsProvider())
      setSelectedNote('')
    },
    onError: (mutationError: unknown) => {
      const message = mutationError instanceof Error ? mutationError.message : t('logisticsConfig.platforms.toasts.unknownError')
      toast.error(t('logisticsConfig.platforms.toasts.saveFailed', { message }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => logisticsProviderService.deleteProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logisticsProviderQueryKey })
      toast.success(t('logisticsConfig.platforms.toasts.deleteSuccess'))
    },
    onError: (mutationError: unknown) => {
      const message = mutationError instanceof Error ? mutationError.message : t('logisticsConfig.platforms.toasts.unknownError')
      toast.error(t('logisticsConfig.platforms.toasts.deleteFailed', { message }))
    },
  })

  const verifyMutation = useMutation({
    mutationFn: (id: number) => logisticsProviderService.verifyProvider(id),
    onSuccess: (provider) => {
      queryClient.invalidateQueries({ queryKey: logisticsProviderQueryKey })
      toast.success(t('logisticsConfig.platforms.toasts.verifySuccess', { summary: t(getProviderVerificationSummaryKey(provider)) }))
    },
    onError: (mutationError: unknown) => {
      const message = mutationError instanceof Error ? mutationError.message : t('logisticsConfig.platforms.toasts.unknownError')
      toast.error(t('logisticsConfig.platforms.toasts.verifyFailed', { message }))
    },
  })

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleApplyTemplate = (code: string) => {
    const template = LOGISTICS_TEMPLATES.find((item) => item.code === code)
    if (!template) return

    setFormData((prev) => applyLogisticsTemplate(prev, code))
    setSelectedNote(template.note)
  }

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setFormData(createEmptyLogisticsProvider())
      setSelectedNote('')
    }
  }

  const openCreateDialog = () => {
    setFormData(createEmptyLogisticsProvider())
    setSelectedNote('')
    setIsDialogOpen(true)
  }

  const handleEdit = (provider: LogisticsProvider) => {
    setFormData(
      toLogisticsProviderDraft({
        ...provider,
        category: getProviderCategory(provider),
      })
    )
    setSelectedNote(provider.note || '')
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    const duplicate = findDuplicateProvider(providers, formData)
    if (duplicate) {
      toast.error(t('logisticsConfig.platforms.states.duplicate', { name: duplicate.name }))
      return
    }

    saveMutation.mutate({
      ...formData,
      category: getProviderCategory(formData),
    })
  }

  const handleDelete = (id?: number) => {
    if (!id) return
    if (typeof window !== 'undefined' && !window.confirm(t('logisticsConfig.platforms.prompts.deleteConfirm'))) {
      return
    }
    deleteMutation.mutate(id)
  }

  const handleVerify = (id?: number) => {
    if (!id) return
    verifyMutation.mutate(id)
  }

  const isFormValid = isLogisticsProviderDraftValid(formData)
  const isCredentialsComplete = isLogisticsProviderCredentialsComplete(formData)
  const previewConnected = isProviderApiConnected(formData)
  const previewVerificationStatus = getProviderVerificationStatus(formData)
  const pageError = error instanceof Error ? error.message : t('logisticsConfig.platforms.states.loadErrorTitle')

  return {
    providers,
    isLoading,
    isFetching,
    isError,
    pageError,
    refetch,
    isDialogOpen,
    showSecrets,
    formData,
    setFormData,
    selectedNote,
    saveMutation,
    deleteMutation,
    verifyMutation,
    isFormValid,
    isCredentialsComplete,
    previewConnected,
    previewVerificationStatus,
    toggleSecret,
    handleApplyTemplate,
    handleDialogChange,
    openCreateDialog,
    handleEdit,
    handleSave,
    handleDelete,
    handleVerify,
  }
}
