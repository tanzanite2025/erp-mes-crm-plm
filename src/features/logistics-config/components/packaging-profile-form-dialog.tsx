import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/language-provider'
import type { Product } from '@/features/engineering/data/schema'
import type { MaterialOption } from '@/features/material-archive/data/schema'
import { cn } from '@/lib/utils'
import type { Unit } from '@/features/basic-settings/services/unit-service'
import type { PackagingProfileDraft } from '../packaging-profile-form'

const packagingFieldClass = 'w-full h-11 min-h-11 rounded-2xl border border-border/50 bg-muted/40 px-4 py-0 text-[11px] font-semibold tracking-tight leading-none shadow-sm shadow-black/5 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:border-primary/30 disabled:opacity-100 disabled:bg-muted/20 disabled:text-foreground/70'
const packagingSelectClass = `${packagingFieldClass} justify-between data-[size=default]:h-11`
const packagingSelectContentClass = 'min-w-[12rem] rounded-2xl border-none shadow-xl [&_[data-slot=select-item]]:text-[10px] [&_[data-slot=select-item]]:font-medium [&_[data-slot=select-item]]:tracking-tight'
const packagingSelectEmptyStateClass = 'px-3 py-2 text-[10px] font-medium leading-relaxed text-muted-foreground/75'
const packagingComboboxContentClass = 'rounded-[24px] border-border/20 bg-popover/98 [&_[data-slot=command-input]]:text-[11px] [&_[data-slot=command-input]]:font-medium [&_[data-slot=command-item]]:text-[10px] [&_[data-slot=command-item]]:font-medium [&_[data-slot=command-item]]:py-2.5 [&_[data-slot=combobox-option-label]]:text-[11px] [&_[data-slot=combobox-option-label]]:font-semibold [&_[data-slot=combobox-option-secondary-badge]]:text-[8px] [&_[data-slot=combobox-option-secondary-text]]:text-[9px] [&_[data-slot=combobox-option-secondary-text]]:font-medium [&_[data-slot=combobox-option-tertiary]]:text-[9px] [&_[data-slot=combobox-option-stats-stage]]:text-[8px] [&_[data-slot=combobox-option-stats-value]]:text-[9px] [&_[data-slot=combobox-option-stats-empty]]:text-[9px] [&_[data-slot=combobox-empty-title]]:text-[10px] [&_[data-slot=combobox-empty-subtitle]]:text-[9px]'
const packagingLabelClass = 'ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'
const packagingSectionClass = 'rounded-[28px] border border-dashed border-border/60 bg-muted/[0.035] p-3.5 md:p-4'
const packagingFieldStackClass = 'space-y-1.5'

interface PackagingProfileFormDialogProps {
  open: boolean
  draft: PackagingProfileDraft
  products: Product[]
  packagingMaterials: MaterialOption[]
  packagingMaterialOptions: {
    value: string
    label: string
    keywords?: string
    secondaryLabel?: string
    tertiaryLabel?: string
  }[]
  dimensionUnits: Unit[]
  weightUnits: Unit[]
  quantityUnits: Unit[]
  resolvedDimensionUnitCode: string
  resolvedWeightUnitCode: string
  resolvedCapacityUnitCode: string
  selectedPackagingMaterialId: string
  selectedProduct: Product | null
  computedVolume: number
  computedGrossWeight: number
  savePending: boolean
  packagingMaterialsLoading: boolean
  onOpenChange: (open: boolean) => void
  onDraftChange: (updater: PackagingProfileDraft | ((current: PackagingProfileDraft) => PackagingProfileDraft)) => void
  onPackagingMaterialChange: (materialId: string) => void
  onProductChange: (productId: string) => void
  onDimensionUnitChange: (value: string) => void
  onWeightUnitChange: (value: string) => void
  onCapacityUnitChange: (value: string) => void
  onSave: () => void
}

export function PackagingProfileFormDialog({
  open,
  draft,
  products,
  packagingMaterialOptions,
  dimensionUnits,
  weightUnits,
  quantityUnits,
  resolvedDimensionUnitCode,
  resolvedWeightUnitCode,
  resolvedCapacityUnitCode,
  selectedPackagingMaterialId,
  selectedProduct,
  computedVolume,
  computedGrossWeight,
  savePending,
  packagingMaterialsLoading,
  onOpenChange,
  onDraftChange,
  onPackagingMaterialChange,
  onProductChange,
  onDimensionUnitChange,
  onWeightUnitChange,
  onCapacityUnitChange,
  onSave,
}: PackagingProfileFormDialogProps) {
  const { t } = useLanguage()
  const selectedTarget = draft.targets[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='full'
        className='flex max-h-[92vh] w-[min(1360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[32px] border-none bg-background p-0 shadow-2xl'
      >
        <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent pointer-events-none' />

        <div className='relative flex-1 overflow-y-auto px-5 py-5 lg:px-6 lg:py-5 space-y-4'>
          <DialogHeader className='space-y-1 mt-1'>
            <DialogTitle className='text-xl font-black italic uppercase tracking-tighter text-primary'>
              {t('logisticsConfig.packagingRules.dialog.title')}
            </DialogTitle>
            <DialogDescription className='text-[10px] font-black uppercase tracking-[0.2em] opacity-40 leading-none'>
              {t('logisticsConfig.packagingRules.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3'>
            <section className={packagingSectionClass}>
              <div className='mb-3 flex items-center justify-between gap-3'>
                <div>
                  <p className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/45'>
                    Packaging Identity
                  </p>
                  <h3 className='mt-1 text-sm font-black uppercase tracking-tight text-foreground'>
                    基础信息
                  </h3>
                </div>
                <Badge variant='outline' className='rounded-full border-primary/15 bg-primary/5 px-3 text-[9px] font-black uppercase tracking-widest text-primary'>
                  01
                </Badge>
              </div>

              <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'>
                <div className={packagingFieldStackClass}>
                  <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.packagingName')}</Label>
                  <Combobox
                    options={packagingMaterialOptions}
                    value={selectedPackagingMaterialId}
                    onValueChange={onPackagingMaterialChange}
                    placeholder={draft.name || '请选择包装物料'}
                    searchPlaceholder='搜索包装物料名称、规格或编码...'
                    emptyText='未找到包装物料'
                    isLoading={packagingMaterialsLoading}
                    variant='industrial'
                    className='h-11! rounded-2xl! border! border-border/50! bg-muted/40! px-4! text-[11px]! font-semibold! tracking-tight! shadow-sm! shadow-black/5!'
                    contentClassName={packagingComboboxContentClass}
                  />
                </div>
                <div className={packagingFieldStackClass}>
                  <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.product')}</Label>
                  <Select value={selectedTarget?.entityId ?? ''} onValueChange={onProductChange}>
                    <SelectTrigger className={packagingSelectClass}>
                      <SelectValue placeholder={t('logisticsConfig.packagingRules.placeholders.product')} />
                    </SelectTrigger>
                    <SelectContent className={packagingSelectContentClass}>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id} className='m-1 rounded-lg'>
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={packagingFieldStackClass}>
                  <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.status')}</Label>
                  <Select value={draft.isActive ? 'active' : 'inactive'} onValueChange={(value) => onDraftChange((current) => ({ ...current, isActive: value === 'active' }))}>
                    <SelectTrigger className={packagingSelectClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={packagingSelectContentClass}>
                      <SelectItem value='active' className='m-1 rounded-lg'>{t('logisticsConfig.packagingRules.statusActive')}</SelectItem>
                      <SelectItem value='inactive' className='m-1 rounded-lg'>{t('logisticsConfig.packagingRules.statusInactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className={packagingFieldStackClass}>
                  <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.dimensionUnit')}</Label>
                  <Select value={resolvedDimensionUnitCode} onValueChange={onDimensionUnitChange}>
                    <SelectTrigger className={packagingSelectClass}>
                      <SelectValue placeholder={t('logisticsConfig.packagingRules.placeholders.dimensionUnit')} />
                    </SelectTrigger>
                    <SelectContent className={packagingSelectContentClass}>
                      {dimensionUnits.length === 0 ? (
                        <div className={packagingSelectEmptyStateClass}>未找到长度单位，请先到单位管理维护长度单位</div>
                      ) : (
                        dimensionUnits.map((unit) => (
                          <SelectItem key={unit.code} value={unit.code} className='m-1 rounded-lg'>
                            {unit.name} ({unit.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className={packagingFieldStackClass}>
                  <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.weightUnit')}</Label>
                  <Select value={resolvedWeightUnitCode} onValueChange={onWeightUnitChange}>
                    <SelectTrigger className={packagingSelectClass}>
                      <SelectValue placeholder={t('logisticsConfig.packagingRules.placeholders.weightUnit')} />
                    </SelectTrigger>
                    <SelectContent className={packagingSelectContentClass}>
                      {weightUnits.length === 0 ? (
                        <div className={packagingSelectEmptyStateClass}>未找到重量单位，请先到单位管理维护重量单位</div>
                      ) : (
                        weightUnits.map((unit) => (
                          <SelectItem key={unit.code} value={unit.code} className='m-1 rounded-lg'>
                            {unit.name} ({unit.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className={packagingFieldStackClass}>
                  <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.quantityUnit')}</Label>
                  <Select value={resolvedCapacityUnitCode} onValueChange={onCapacityUnitChange}>
                    <SelectTrigger className={packagingSelectClass}>
                      <SelectValue placeholder={t('logisticsConfig.packagingRules.placeholders.capacityUnit')} />
                    </SelectTrigger>
                    <SelectContent className={packagingSelectContentClass}>
                      {quantityUnits.length === 0 ? (
                        <div className={packagingSelectEmptyStateClass}>未找到数量单位，请先到单位管理维护数量单位</div>
                      ) : (
                        quantityUnits.map((unit) => (
                          <SelectItem key={unit.code} value={unit.code} className='m-1 rounded-lg'>
                            {unit.name} ({unit.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className={packagingFieldStackClass}>
                  <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.productWeight')}</Label>
                  <Input className={cn(packagingFieldClass, 'font-mono')} value={selectedProduct?.weight ?? 0} disabled />
                </div>
              </div>
            </section>

            <section className={packagingSectionClass}>
              <div className='mb-3 flex items-center justify-between gap-3'>
                <div>
                  <p className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/45'>
                    Packaging Metrics
                  </p>
                  <h3 className='mt-1 text-sm font-black uppercase tracking-tight text-foreground'>
                    尺寸与装箱
                  </h3>
                </div>
                <Badge variant='outline' className='rounded-full border-primary/15 bg-background/80 px-3 text-[9px] font-black uppercase tracking-widest text-primary'>
                  02
                </Badge>
              </div>

              <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4'>
                <div className={packagingFieldStackClass}>
                  <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.length')}</Label>
                  <Input
                    type='number'
                    className={cn(packagingFieldClass, 'font-mono')}
                    value={draft.length}
                    onChange={(event) => onDraftChange((current) => ({ ...current, length: Number(event.target.value) || 0 }))}
                  />
                </div>
                <div className={packagingFieldStackClass}>
                  <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.width')}</Label>
                  <Input
                    type='number'
                    className={cn(packagingFieldClass, 'font-mono')}
                    value={draft.width}
                    onChange={(event) => onDraftChange((current) => ({ ...current, width: Number(event.target.value) || 0 }))}
                  />
                </div>
                <div className={packagingFieldStackClass}>
                  <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.height')}</Label>
                  <Input
                    type='number'
                    className={cn(packagingFieldClass, 'font-mono')}
                    value={draft.height}
                    onChange={(event) => onDraftChange((current) => ({ ...current, height: Number(event.target.value) || 0 }))}
                  />
                </div>
                <div className={packagingFieldStackClass}>
                  <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.quantity')}</Label>
                  <Input
                    type='number'
                    className={cn(packagingFieldClass, 'font-mono')}
                    value={draft.capacity}
                    onChange={(event) => onDraftChange((current) => ({
                      ...current,
                      capacity: Number(event.target.value) || 0,
                      grossWeight: current.netWeight + (selectedProduct?.weight ?? 0) * (Number(event.target.value) || 0),
                    }))}
                  />
                </div>
              </div>
            </section>
          </div>

          <div className='grid grid-cols-1 gap-2.5 rounded-[24px] border border-dashed bg-primary/5 p-3.5 md:grid-cols-3'>
            <div>
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.summary.volume')}</div>
              <div className='mt-1 text-xl font-black italic tracking-tighter text-primary'>{computedVolume} <span className='text-[10px] not-italic opacity-50'>{draft.dimensionUnitCode || '-'}³</span></div>
            </div>
            <div>
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.summary.productWeightTotal')}</div>
              <div className='mt-1 text-xl font-black italic tracking-tighter text-primary'>{(selectedProduct?.weight ?? 0) * draft.capacity} <span className='text-[10px] not-italic opacity-50'>{draft.weightUnitCode || '-'}</span></div>
            </div>
            <div>
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.summary.grossWeight')}</div>
              <div className='mt-1 text-xl font-black italic tracking-tighter text-primary'>{computedGrossWeight} <span className='text-[10px] not-italic opacity-50'>{draft.weightUnitCode || '-'}</span></div>
            </div>
          </div>

          <div className={packagingFieldStackClass}>
            <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.notes')}</Label>
            <Textarea
              className='min-h-[72px] rounded-2xl border border-border/50 bg-muted/40 px-4 py-2.5 text-[11px] font-medium tracking-tight shadow-sm shadow-black/5 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:border-primary/30 resize-none'
              value={draft.notes ?? ''}
              onChange={(event) => onDraftChange((current) => ({ ...current, notes: event.target.value }))}
              rows={2}
            />
          </div>

          <DialogFooter className='pt-1'>
            <Button
              variant='ghost'
              className='h-11 px-8 text-[10px] font-black uppercase tracking-widest'
              onClick={() => onOpenChange(false)}
            >
              {t('logisticsConfig.packagingRules.cancel')}
            </Button>
            <Button
              className='h-11 px-8 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95'
              onClick={onSave}
              disabled={savePending}
            >
              {t('logisticsConfig.packagingRules.save')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
