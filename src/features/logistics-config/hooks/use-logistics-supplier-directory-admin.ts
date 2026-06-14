import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import {
  applyLogisticsTemplate,
  createEmptyLogisticsProvider,
  findDuplicateProvider,
  findLogisticsTemplateByCode,
  getProviderCategory,
  getProviderVerificationStatus,
  isProviderApiConnected,
  logisticsProviderQueryKey,
} from '@/features/logistics-config/provider-directory'
import { toLogisticsProviderDraft } from '@/features/sandbox/logistics-api/adapters/logistics-provider-adapter'
import {
  isLogisticsProviderCredentialsComplete,
  isLogisticsProviderDraftValid,
} from '@/features/sandbox/logistics-api/data/logistics-provider-rules'
import { logisticsProviderService } from '@/features/sandbox/logistics-api/services/logistics-provider-service'
import type {
  LogisticsProvider,
  LogisticsProviderDraft,
} from '@/features/sandbox/logistics-api/types'

export function useLogisticsSupplierDirectoryAdmin() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTemplateNote, setSelectedTemplateNote] = useState('')
  const [formData, setFormData] = useState<LogisticsProviderDraft>(
    createEmptyLogisticsProvider()
  )

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
    mutationFn: (provider: LogisticsProviderDraft) =>
      logisticsProviderService.saveProvider(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logisticsProviderQueryKey })
      toast.success(t('logisticsConfig.suppliers.toasts.saveSuccess'))
      setIsDialogOpen(false)
      setFormData(createEmptyLogisticsProvider())
      setSelectedTemplateNote('')
    },
    onError: (mutationError: unknown) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : t('logisticsConfig.suppliers.toasts.unknownError')
      toast.error(t('logisticsConfig.suppliers.toasts.saveFailed', { message }))
    },
  })

  const sortedProviders = [...providers].sort((a, b) =>
    a.name.localeCompare(b.name, 'zh-CN')
  )
  const pageError =
    error instanceof Error
      ? error.message
      : t('logisticsConfig.suppliers.errors.loadFailed')
  const isFormValid = isLogisticsProviderDraftValid(formData)
  const isCredentialsComplete = isLogisticsProviderCredentialsComplete(formData)
  const previewConnected = isProviderApiConnected(formData)
  const previewVerificationStatus = getProviderVerificationStatus(formData)

  const resetForm = () => {
    setFormData(createEmptyLogisticsProvider())
    setSelectedTemplateNote('')
  }

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const handleApplyTemplate = (code: string) => {
    const template = findLogisticsTemplateByCode(code)
    if (!template) return

    setFormData((prev) => applyLogisticsTemplate(prev, code))
    setSelectedTemplateNote(template.note)
  }

  const handleEdit = (provider: LogisticsProvider) => {
    setFormData(
      toLogisticsProviderDraft({
        ...provider,
        category: getProviderCategory(provider),
      })
    )
    setSelectedTemplateNote(
      findLogisticsTemplateByCode(provider.code)?.note || ''
    )
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    const duplicate = findDuplicateProvider(providers, formData)
    if (duplicate) {
      toast.error(
        t('logisticsConfig.suppliers.toasts.duplicate', {
          name: duplicate.name,
        })
      )
      return
    }

    saveMutation.mutate({
      ...formData,
      category: getProviderCategory(formData),
    })
  }

  return {
    sortedProviders,
    isLoading,
    isFetching,
    isError,
    pageError,
    refetch,
    isDialogOpen,
    formData,
    setFormData,
    selectedTemplateNote,
    saveMutation,
    isFormValid,
    isCredentialsComplete,
    previewConnected,
    previewVerificationStatus,
    handleDialogChange,
    openCreateDialog,
    handleApplyTemplate,
    handleEdit,
    handleSave,
  }
}
