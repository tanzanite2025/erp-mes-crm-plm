import { Truck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { LogisticsSupplierCard } from '@/features/logistics-config/components/logistics-supplier-card'
import { LogisticsSupplierFormDialog } from '@/features/logistics-config/components/logistics-supplier-form-dialog'
import { LogisticsSupplierState } from '@/features/logistics-config/components/logistics-supplier-state'
import { LogisticsSupplierToolbar } from '@/features/logistics-config/components/logistics-supplier-toolbar'
import { useLogisticsSupplierDirectoryAdmin } from '@/features/logistics-config/hooks/use-logistics-supplier-directory-admin'

export function LogisticsSupplierDirectoryTab() {
  const { t, locale } = useLanguage()
  const {
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
  } = useLogisticsSupplierDirectoryAdmin()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-4 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-2 text-primary'>
              <Truck className='size-5' />
              <h2 className='text-lg font-black tracking-tighter italic uppercase'>
                {t('logisticsConfig.suppliers.title')}
              </h2>
            </div>
            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60'>
              {t('logisticsConfig.suppliers.description')}
            </p>
            <p className='text-xs leading-relaxed text-muted-foreground'>
              {t('logisticsConfig.suppliers.directoryNote')}
            </p>
          </div>
          <LogisticsSupplierToolbar
            isFetching={isFetching}
            onRefresh={() => void refetch()}
            onAdd={openCreateDialog}
          />
        </div>
      </div>

      <LogisticsSupplierFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogChange}
        formData={formData}
        setFormData={setFormData}
        selectedTemplateNote={selectedTemplateNote}
        previewConnected={previewConnected}
        previewVerificationStatus={previewVerificationStatus}
        isFormValid={isFormValid}
        isCredentialsComplete={isCredentialsComplete}
        savePending={saveMutation.isPending}
        onApplyTemplate={handleApplyTemplate}
        onSave={handleSave}
      />

      {isError ? (
        <LogisticsSupplierState type='error' message={pageError} />
      ) : isLoading ? (
        <LogisticsSupplierState type='loading' />
      ) : sortedProviders.length === 0 ? (
        <LogisticsSupplierState type='empty' />
      ) : (
        <div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
          {sortedProviders.map((entry) => (
            <LogisticsSupplierCard
              key={String(entry.id ?? entry.code)}
              provider={entry}
              locale={locale}
              onEdit={() => handleEdit(entry)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
