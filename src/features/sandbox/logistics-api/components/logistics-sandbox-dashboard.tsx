import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import {
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { LogisticsProviderFormDialog } from '@/features/sandbox/logistics-api/components/logistics-provider-form-dialog'
import { LogisticsProviderCard } from '@/features/sandbox/logistics-api/components/logistics-provider-card'
import { LogisticsPlatformState } from '@/features/sandbox/logistics-api/components/logistics-platform-state'
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
    <div className='mt-4 mx-4 min-h-screen rounded-[40px] border border-dashed border-slate-200 bg-slate-50/50 p-8 shadow-inner animate-in fade-in zoom-in-95 duration-500'>
      <div className='space-y-8'>
        <div className='flex justify-end gap-3'>
          <Button
            type='button'
            variant='outline'
            onClick={() => void refetch()}
            disabled={isFetching}
            className='h-12 rounded-full px-6 font-black text-[10px] uppercase tracking-widest'
          >
            {isFetching ? <Loader2 className='mr-2 size-4 animate-spin' /> : <RefreshCw className='mr-2 size-4' />}
            {t('logisticsConfig.platforms.actions.refresh')}
          </Button>

          <Button
            className='h-12 rounded-full bg-slate-900 px-8 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 transition-all hover:scale-105'
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
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
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
