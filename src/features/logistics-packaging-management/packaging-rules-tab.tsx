'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { failLoudly } from '@/lib/safe-catch'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { PackagingProfileFormDialog } from './components/packaging-profile-form-dialog'
import { usePackagingProfileFormController } from './hooks/use-packaging-profile-form-controller'
import {
  packagingRulesService,
  type PackagingProfile,
} from './packaging-rules-service'
import { packagingManagementQueryKeys } from './query-keys'

export function LogisticsPackagingRulesTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const formController = usePackagingProfileFormController()

  const profilesQuery = useQuery({
    queryKey: packagingManagementQueryKeys.profiles(),
    queryFn: () => packagingRulesService.getProfiles(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => packagingRulesService.deleteProfile(id),
    onSuccess: (_result, deletedId) => {
      queryClient.setQueryData<PackagingProfile[]>(
        packagingManagementQueryKeys.profiles(),
        (current) => current?.filter((item) => item.id !== deletedId)
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
    if (
      !window.confirm(
        t('logisticsPackagingManagement.packagingRules.deleteConfirm')
      )
    )
      return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success(
        t('logisticsPackagingManagement.packagingRules.toasts.deleteSuccess')
      )
    } catch (error) {
      failLoudly(error, 'LogisticsPackagingRulesTab.delete')
      toast.error(
        t('logisticsPackagingManagement.packagingRules.toasts.deleteFailed')
      )
    }
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={Package2}
        title={t('logisticsPackagingManagement.packagingRules.title')}
        description={t(
          'logisticsPackagingManagement.packagingRules.description'
        )}
      />

      <div className='flex justify-end'>
        <Button
          className='h-11 rounded-full px-6 text-[10px] font-black tracking-widest uppercase shadow-lg transition-all duration-300 hover:shadow-xl'
          onClick={() => formController.handleCreate()}
        >
          <Plus className='mr-2 size-4' />
          {t('logisticsPackagingManagement.packagingRules.addRule')}
        </Button>
      </div>

      <div className='overflow-hidden rounded-[24px] border border-dashed bg-muted/5 p-4 transition-all duration-500 hover:border-primary/20 md:p-6'>
        <Table>
          <TableHeader>
            <TableRow className='border-dashed hover:bg-transparent'>
              <TableHead className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('logisticsPackagingManagement.packagingRules.table.name')}
              </TableHead>
              <TableHead className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('logisticsPackagingManagement.packagingRules.table.product')}
              </TableHead>
              <TableHead className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t(
                  'logisticsPackagingManagement.packagingRules.table.quantity'
                )}
              </TableHead>
              <TableHead className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('logisticsPackagingManagement.packagingRules.table.size')}
              </TableHead>
              <TableHead className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('logisticsPackagingManagement.packagingRules.table.volume')}
              </TableHead>
              <TableHead className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('logisticsPackagingManagement.packagingRules.table.weight')}
              </TableHead>
              <TableHead className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('logisticsPackagingManagement.packagingRules.table.status')}
              </TableHead>
              <TableHead className='text-right text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('logisticsPackagingManagement.packagingRules.table.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className='h-28 text-center text-muted-foreground'
                >
                  {isLoading
                    ? t(
                        'logisticsPackagingManagement.packagingRules.emptyLoading'
                      )
                    : t(
                        'logisticsPackagingManagement.packagingRules.emptyState'
                      )}
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((profile) => (
                <TableRow
                  key={profile.id}
                  className='border-dashed transition-colors hover:bg-muted/5'
                >
                  <TableCell className='text-sm font-black tracking-tight text-primary italic transition-all group-hover:pl-4'>
                    {profile.name}
                  </TableCell>
                  <TableCell className='text-xs font-medium opacity-80'>
                    {profile.targets[0]?.entityName || '-'}
                  </TableCell>
                  <TableCell className='font-mono text-[10px] font-bold'>
                    {profile.capacity} {profile.capacityUnitCode}
                  </TableCell>
                  <TableCell className='font-mono text-[10px]'>
                    <div className='flex flex-col gap-1'>
                      <span>
                        {profile.length} × {profile.width} × {profile.height}{' '}
                        <span className='opacity-50'>
                          {profile.dimensionUnitCode}
                        </span>
                      </span>
                      <span className='flex flex-wrap gap-1'>
                        <Badge
                          variant='outline'
                          className='h-5 rounded-full border-primary/15 bg-primary/5 px-2 text-[8px] font-black text-primary'
                        >
                          旋转 {profile.canRotate ? '是' : '否'}
                        </Badge>
                        <Badge
                          variant='outline'
                          className='h-5 rounded-full border-primary/15 bg-primary/5 px-2 text-[8px] font-black text-primary'
                        >
                          横放 {profile.canInvert ? '是' : '否'}
                        </Badge>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className='text-[10px] font-bold tracking-tighter'>
                    {profile.length * profile.width * profile.height}{' '}
                    <span className='opacity-50'>
                      {profile.dimensionUnitCode}³
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-col gap-0.5'>
                      <div className='flex items-center gap-1.5'>
                        <span className='text-[8px] leading-none font-black tracking-widest uppercase opacity-40'>
                          {t(
                            'logisticsPackagingManagement.packagingRules.packagingWeightLabel'
                          )}
                        </span>
                        <span className='font-mono text-[10px] leading-none font-bold'>
                          {profile.netWeight} {profile.weightUnitCode}
                        </span>
                      </div>
                      <div className='flex items-center gap-1.5'>
                        <span className='text-[8px] leading-none font-black tracking-widest uppercase opacity-40'>
                          {t(
                            'logisticsPackagingManagement.packagingRules.grossWeightLabel'
                          )}
                        </span>
                        <span className='font-mono text-[10px] leading-none font-bold text-primary'>
                          {profile.grossWeight} {profile.weightUnitCode}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={profile.isActive ? 'default' : 'secondary'}
                      className={cn(
                        'h-5 rounded-full border-none px-2 font-mono text-[8px] tracking-tighter uppercase',
                        profile.isActive
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-amber-500/10 text-amber-600'
                      )}
                    >
                      {profile.isActive
                        ? t(
                            'logisticsPackagingManagement.packagingRules.statusActive'
                          )
                        : t(
                            'logisticsPackagingManagement.packagingRules.statusInactive'
                          )}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-1'>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-7 text-[10px] font-black tracking-widest uppercase transition-colors hover:bg-primary/10 hover:text-primary'
                        onClick={() => formController.handleEdit(profile)}
                      >
                        {t('logisticsPackagingManagement.packagingRules.edit')}
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-7 w-7 p-0 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600'
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
        onPackagingMaterialChange={
          formController.updateSelectedPackagingMaterial
        }
        onProductChange={formController.updateSelectedProduct}
        onDimensionUnitChange={(value) =>
          formController.setDraft((current) => ({
            ...current,
            dimensionUnitCode: value,
          }))
        }
        onWeightUnitChange={(value) =>
          formController.setDraft((current) => ({
            ...current,
            weightUnitCode: value,
          }))
        }
        onCapacityUnitChange={(value) =>
          formController.setDraft((current) => ({
            ...current,
            capacityUnitCode: value,
          }))
        }
        onSave={formController.handleSave}
      />
    </div>
  )
}
