'use client'

import { Boxes, Package } from 'lucide-react'
import { useMemo } from 'react'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import {
  type InventoryThresholdBOMOption,
  type InventoryThresholdMaterialOption,
  type InventoryThresholdTargetType,
} from '../data/schema'

interface MaterialThresholdTargetPickerProps {
  targetType: InventoryThresholdTargetType
  onTargetTypeChange: (targetType: InventoryThresholdTargetType) => void
  materialId?: string
  bomId?: string
  onMaterialIdChange: (materialId: string) => void
  onBomIdChange: (bomId: string) => void
  materialOptions: InventoryThresholdMaterialOption[]
  bomOptions: InventoryThresholdBOMOption[]
  disabled?: boolean
  disableTargetTypeChange?: boolean
  disableTargetSelection?: boolean
}

export function MaterialThresholdTargetPicker({
  targetType,
  onTargetTypeChange,
  materialId,
  bomId,
  onMaterialIdChange,
  onBomIdChange,
  materialOptions,
  bomOptions,
  disabled = false,
  disableTargetTypeChange = false,
  disableTargetSelection = false,
}: MaterialThresholdTargetPickerProps) {
  const { t } = useLanguage()

  const materialComboboxOptions = useMemo(
    () =>
      materialOptions.map((item) => ({
        value: item.id,
        label: item.name,
        secondaryLabel: item.spec || item.category || item.uom,
        tertiaryLabel: item.code,
        keywords: [item.code, item.category, item.spec, item.uom, item.status]
          .filter(Boolean)
          .join(' '),
      })),
    [materialOptions]
  )

  const bomComboboxOptions = useMemo(
    () =>
      bomOptions.map((item) => ({
        value: item.id,
        label: item.productName || item.bomNo,
        secondaryLabel: item.productSku || item.status,
        tertiaryLabel: item.bomNo,
        keywords: [item.bomNo, item.productName, item.productSku, item.status]
          .filter(Boolean)
          .join(' '),
      })),
    [bomOptions]
  )

  return (
    <div className='space-y-4 rounded-[24px] border border-dashed border-primary/20 bg-primary/3 p-5'>
      <div className='space-y-2'>
        <Label className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
          {t('warehouseConfig.materialThresholds.dialog.targetTypeLabel')}
        </Label>
        <div className='grid grid-cols-2 gap-2 rounded-[20px] bg-background/80 p-1'>
          <Button
            type='button'
            variant='ghost'
            disabled={disabled || disableTargetTypeChange}
            onClick={() => onTargetTypeChange('MATERIAL')}
            className={cn(
              'h-11 rounded-2xl text-[10px] font-black tracking-widest uppercase',
              targetType === 'MATERIAL'
                ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15'
                : 'text-muted-foreground/70 hover:bg-muted/60'
            )}
          >
            <Package className='mr-2 size-4' />
            {t('warehouseConfig.materialThresholds.dialog.targetTypeMaterial')}
          </Button>
          <Button
            type='button'
            variant='ghost'
            disabled={disabled || disableTargetTypeChange}
            onClick={() => onTargetTypeChange('BOM')}
            className={cn(
              'h-11 rounded-2xl text-[10px] font-black tracking-widest uppercase',
              targetType === 'BOM'
                ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/15'
                : 'text-muted-foreground/70 hover:bg-muted/60'
            )}
          >
            <Boxes className='mr-2 size-4' />
            {t('warehouseConfig.materialThresholds.dialog.targetTypeBom')}
          </Button>
        </div>
      </div>

      {targetType === 'MATERIAL' ? (
        <div className='space-y-2'>
          <Label className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            {t('warehouseConfig.materialThresholds.dialog.materialTargetLabel')}
          </Label>
          <Combobox
            variant='industrial'
            disabled={disabled || disableTargetSelection}
            options={materialComboboxOptions}
            value={materialId}
            onValueChange={onMaterialIdChange}
            placeholder={t('warehouseConfig.materialThresholds.dialog.materialTargetPlaceholder')}
            searchPlaceholder={t('warehouseConfig.materialThresholds.dialog.materialSearchPlaceholder')}
            emptyText={t('warehouseConfig.materialThresholds.dialog.materialEmptyText')}
          />
        </div>
      ) : (
        <div className='space-y-2'>
          <Label className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            {t('warehouseConfig.materialThresholds.dialog.bomTargetLabel')}
          </Label>
          <Combobox
            variant='industrial'
            disabled={disabled || disableTargetSelection}
            options={bomComboboxOptions}
            value={bomId}
            onValueChange={onBomIdChange}
            placeholder={t('warehouseConfig.materialThresholds.dialog.bomTargetPlaceholder')}
            searchPlaceholder={t('warehouseConfig.materialThresholds.dialog.bomSearchPlaceholder')}
            emptyText={t('warehouseConfig.materialThresholds.dialog.bomEmptyText')}
          />
        </div>
      )}
    </div>
  )
}
