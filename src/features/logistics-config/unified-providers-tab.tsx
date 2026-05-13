import { useState } from 'react'
import { BookOpen, Plug, Truck } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/context/language-provider'
import { LogisticsSandboxDashboard } from '@/features/sandbox/logistics-api/components/logistics-sandbox-dashboard'
import { LogisticsSupplierCard } from '@/features/logistics-config/components/logistics-supplier-card'
import { LogisticsSupplierFormDialog } from '@/features/logistics-config/components/logistics-supplier-form-dialog'
import { LogisticsSupplierState } from '@/features/logistics-config/components/logistics-supplier-state'
import { LogisticsSupplierToolbar } from '@/features/logistics-config/components/logistics-supplier-toolbar'
import { useLogisticsSupplierDirectoryAdmin } from '@/features/logistics-config/hooks/use-logistics-supplier-directory-admin'

type ViewMode = 'directory' | 'integration'

export function UnifiedProvidersTab() {
  const { t, locale } = useLanguage()
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // 从 localStorage 恢复用户上次选择的视图
    const saved = localStorage.getItem('logistics-view-mode')
    return (saved === 'integration' ? 'integration' : 'directory') as ViewMode
  })

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

  const handleViewChange = (value: string) => {
    const newMode = value as ViewMode
    setViewMode(newMode)
    localStorage.setItem('logistics-view-mode', newMode)
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      {/* 页面标题 */}
      <div className='flex flex-col gap-4 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-2 text-primary'>
              <Truck className='size-5' />
              <h2 className='text-lg font-black tracking-tighter italic uppercase'>
                {t('logisticsConfig.unified.title')}
              </h2>
            </div>
            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60'>
              {t('logisticsConfig.unified.description')}
            </p>
            <p className='text-xs leading-relaxed text-muted-foreground'>
              {t('logisticsConfig.unified.note')}
            </p>
          </div>
        </div>
      </div>

      {/* 视图切换 Tabs */}
      <Tabs value={viewMode} onValueChange={handleViewChange} className='w-full'>
        <TabsList className='grid w-full max-w-md grid-cols-2 rounded-full bg-muted/50 p-1'>
          <TabsTrigger
            value='directory'
            className='rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm'
          >
            <BookOpen className='mr-2 size-4' />
            <span className='text-xs font-black uppercase tracking-wider'>
              {t('logisticsConfig.unified.views.directory')}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value='integration'
            className='rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm'
          >
            <Plug className='mr-2 size-4' />
            <span className='text-xs font-black uppercase tracking-wider'>
              {t('logisticsConfig.unified.views.integration')}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* 目录视图 */}
        <TabsContent value='directory' className='mt-6 space-y-6'>
          <div className='flex justify-end'>
            <LogisticsSupplierToolbar
              isFetching={isFetching}
              onRefresh={() => void refetch()}
              onAdd={openCreateDialog}
            />
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
        </TabsContent>

        {/* 接口视图 */}
        <TabsContent value='integration' className='mt-6'>
          <LogisticsSandboxDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
