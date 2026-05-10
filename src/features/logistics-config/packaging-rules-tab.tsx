'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLanguage } from '@/context/language-provider'
import { failLoudly } from '@/lib/safe-catch'
import { cn } from '@/lib/utils'
import { PackagingProfileFormDialog } from './components/packaging-profile-form-dialog'
import { usePackagingProfileFormController } from './hooks/use-packaging-profile-form-controller'
import { packagingRulesService, type PackagingProfile } from './packaging-rules-service'

const PACKAGING_PROFILE_QUERY_KEY = ['logistics-config', 'packaging-profiles'] as const

export function LogisticsPackagingRulesTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const formController = usePackagingProfileFormController()

  const profilesQuery = useQuery({
    queryKey: PACKAGING_PROFILE_QUERY_KEY,
    queryFn: () => packagingRulesService.getProfiles(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => packagingRulesService.deleteProfile(id),
    onSuccess: (_result, deletedId) => {
      queryClient.setQueryData<PackagingProfile[]>(PACKAGING_PROFILE_QUERY_KEY, (current) =>
        current?.filter((item) => item.id !== deletedId)
      )
    },
  })

  const isLoading = profilesQuery.isLoading || formController.isLoading

  if (profilesQuery.isError) {
    failLoudly(profilesQuery.error, 'LogisticsPackagingRulesTab.profiles')
    throw profilesQuery.error
  }
  if (!isLoading && !profilesQuery.data) {
    const error = new Error('[CRITICAL] Missing packaging profiles payload')
    failLoudly(error, 'LogisticsPackagingRulesTab.profiles')
    throw error
  }

  const profiles = profilesQuery.data ?? []

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('logisticsConfig.packagingRules.deleteConfirm'))) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success(t('logisticsConfig.packagingRules.toasts.deleteSuccess'))
    } catch (error) {
      failLoudly(error, 'LogisticsPackagingRulesTab.delete')
      toast.error(t('logisticsConfig.packagingRules.toasts.deleteFailed'))
    }
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Package2}
        title={t('logisticsConfig.packagingRules.title')}
        description={t('logisticsConfig.packagingRules.description')}
      />

      <div className='flex justify-end'>
        <Button 
          className='h-11 rounded-full font-black text-[10px] uppercase tracking-widest px-6 shadow-lg hover:shadow-xl transition-all duration-300' 
          onClick={() => formController.handleCreate()}
        >
          <Plus className='mr-2 size-4' />
          {t('logisticsConfig.packagingRules.addRule')}
        </Button>
      </div>

      <div className='rounded-[24px] border border-dashed bg-muted/5 p-4 md:p-6 overflow-hidden transition-all duration-500 hover:border-primary/20'>
        <Table>
          <TableHeader>
            <TableRow className='hover:bg-transparent border-dashed'>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.name')}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.product')}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.quantity')}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.size')}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.volume')}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.weight')}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.status')}</TableHead>
              <TableHead className='text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className='h-28 text-center text-muted-foreground'>
                  {isLoading
                    ? t('logisticsConfig.packagingRules.emptyLoading')
                    : t('logisticsConfig.packagingRules.emptyState')}
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((profile) => (
                <TableRow key={profile.id} className='border-dashed hover:bg-muted/5 transition-colors'>
                  <TableCell className='font-black italic text-sm tracking-tight text-primary transition-all group-hover:pl-4'>
                    {profile.name}
                  </TableCell>
                  <TableCell className='font-medium text-xs opacity-80'>{profile.targets[0]?.entityName || '-'}</TableCell>
                  <TableCell className='font-mono text-[10px] font-bold'>
                    {profile.capacity} {profile.capacityUnitCode}
                  </TableCell>
                  <TableCell className='font-mono text-[10px]'>
                    {profile.length} × {profile.width} × {profile.height} <span className='opacity-50'>{profile.dimensionUnitCode}</span>
                  </TableCell>
                  <TableCell className='font-bold text-[10px] tracking-tighter'>
                    {profile.length * profile.width * profile.height} <span className='opacity-50'>{profile.dimensionUnitCode}³</span>
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-col gap-0.5'>
                      <div className='flex items-center gap-1.5'>
                        <span className='text-[8px] font-black uppercase tracking-widest opacity-40 leading-none'>{t('logisticsConfig.packagingRules.packagingWeightLabel')}</span>
                        <span className='font-mono text-[10px] font-bold leading-none'>{profile.netWeight} {profile.weightUnitCode}</span>
                      </div>
                      <div className='flex items-center gap-1.5'>
                        <span className='text-[8px] font-black uppercase tracking-widest opacity-40 leading-none'>{t('logisticsConfig.packagingRules.grossWeightLabel')}</span>
                        <span className='font-mono text-[10px] font-bold leading-none text-primary'>{profile.grossWeight} {profile.weightUnitCode}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={profile.isActive ? 'default' : 'secondary'}
                      className={cn(
                        'h-5 rounded-full px-2 text-[8px] font-mono uppercase tracking-tighter border-none',
                        profile.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      )}
                    >
                      {profile.isActive
                        ? t('logisticsConfig.packagingRules.statusActive')
                        : t('logisticsConfig.packagingRules.statusInactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-1'>
                      <Button 
                        variant='ghost' 
                        size='sm' 
                        className='h-7 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-colors'
                        onClick={() => formController.handleEdit(profile)}
                      >
                        {t('logisticsConfig.packagingRules.edit')}
                      </Button>
                      <Button 
                        variant='ghost' 
                        size='sm' 
                        className='h-7 w-7 p-0 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-colors'
                        onClick={() => handleDelete(profile.id)}
                      >
                        <Trash2 className='size-3.5' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PackagingProfileFormDialog
        open={formController.open}
        draft={formController.draft}
        products={formController.products}
        packagingMaterials={formController.packagingMaterials}
        packagingMaterialOptions={formController.packagingMaterialOptions}
        dimensionUnits={formController.dimensionUnits}
        weightUnits={formController.weightUnits}
        quantityUnits={formController.quantityUnits}
        resolvedDimensionUnitCode={formController.resolvedDimensionUnitCode}
        resolvedWeightUnitCode={formController.resolvedWeightUnitCode}
        resolvedCapacityUnitCode={formController.resolvedCapacityUnitCode}
        selectedPackagingMaterialId={formController.selectedPackagingMaterialId}
        selectedProduct={formController.selectedProduct}
        computedVolume={formController.computedVolume}
        computedGrossWeight={formController.computedGrossWeight}
        savePending={formController.savePending}
        packagingMaterialsLoading={formController.packagingMaterialsLoading}
        onOpenChange={formController.setOpen}
        onDraftChange={formController.setDraft}
        onPackagingMaterialChange={formController.updateSelectedPackagingMaterial}
        onProductChange={formController.updateSelectedProduct}
        onDimensionUnitChange={(value) =>
          formController.setDraft((current) => ({ ...current, dimensionUnitCode: value }))
        }
        onWeightUnitChange={(value) =>
          formController.setDraft((current) => ({ ...current, weightUnitCode: value }))
        }
        onCapacityUnitChange={(value) =>
          formController.setDraft((current) => ({ ...current, capacityUnitCode: value }))
        }
        onSave={formController.handleSave}
      />
    </div>
  )
}
