import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { LogisticsPlatformState } from '@/features/sandbox/logistics-api/components/logistics-platform-state'
import { LogisticsProviderCard } from '@/features/sandbox/logistics-api/components/logistics-provider-card'
import { LogisticsProviderFormDialog } from '@/features/sandbox/logistics-api/components/logistics-provider-form-dialog'
import { useLogisticsPlatformAdmin } from '@/features/sandbox/logistics-api/hooks/use-logistics-platform-admin'
import type { LogisticsProvider } from '../types'

function getProviderSecretKey(provider: LogisticsProvider) {
  return String(provider.id ?? provider.code)
}

export function LogisticsSandboxDashboard() {
  const { locale, t } = useLanguage()
  const {
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
  } = useLogisticsPlatformAdmin()

  return (
    <div className='animate-in rounded-[32px] border border-dashed border-slate-200 bg-slate-50/50 px-4 py-5 shadow-inner duration-500 zoom-in-95 fade-in sm:px-5 lg:px-6 lg:py-6'>
      <div className='space-y-5 lg:space-y-6'>
        <div className='flex flex-wrap justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => void refetch()}
            disabled={isFetching}
            className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
          >
            {isFetching ? (
              <Loader2 className='mr-2 size-4 animate-spin' />
            ) : (
              <RefreshCw className='mr-2 size-4' />
            )}
            {t('logisticsConfig.platforms.actions.refresh')}
          </Button>

          <Button
            className='h-11 rounded-full bg-slate-900 px-6 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-slate-900/20 transition-all'
            onClick={openCreateDialog}
          >
            <Plus className='mr-2 size-4' />
            {t('logisticsConfig.platforms.actions.add')}
          </Button>
        </div>

        <LogisticsProviderFormDialog
          open={isDialogOpen}
          onOpenChange={handleDialogChange}
          formData={formData}
          setFormData={setFormData}
          selectedNote={selectedNote}
          previewConnected={previewConnected}
          previewVerificationStatus={previewVerificationStatus}
          isFormValid={isFormValid}
          isCredentialsComplete={isCredentialsComplete}
          savePending={saveMutation.isPending}
          onApplyTemplate={handleApplyTemplate}
          onSave={handleSave}
        />

        {isError ? (
          <LogisticsPlatformState type='error' message={pageError} />
        ) : isLoading ? (
          <LogisticsPlatformState type='loading' />
        ) : providers.length === 0 ? (
          <LogisticsPlatformState type='empty' />
        ) : (
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3'>
            {providers.map((provider) => {
              const secretKey = getProviderSecretKey(provider)

              return (
                <LogisticsProviderCard
                  key={secretKey}
                  provider={provider}
                  locale={locale}
                  showSecret={Boolean(showSecrets[secretKey])}
                  verifyPending={verifyMutation.isPending}
                  deletePending={deleteMutation.isPending}
                  onToggleSecret={() => toggleSecret(secretKey)}
                  onEdit={() => handleEdit(provider)}
                  onVerify={() => handleVerify(provider.id)}
                  onDelete={() => handleDelete(provider.id)}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
