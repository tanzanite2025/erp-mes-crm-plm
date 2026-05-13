'use client'

import type { UseFormReturn } from 'react-hook-form'
import { Combobox } from '@/components/ui/combobox'
import { FormField } from '@/components/ui/form'
import { TableCell } from '@/components/ui/table'
import { useLanguage } from '@/context/language-provider'
import { failLoudly } from '@/lib/safe-catch'
import { type MaterialOption } from '../../../material-archive/data/schema'
import { type EnrichedMaterialOption } from '../../hooks/use-enriched-material-options'
import { type BOM } from '../../data/schema'

interface PrimaryMaterialCellProps {
  form: UseFormReturn<BOM>
  index: number
  sortedMaterials: EnrichedMaterialOption[]
  materialMap: Map<string, MaterialOption>
  disabled?: boolean
}

export function PrimaryMaterialCell({
  form,
  index,
  sortedMaterials,
  materialMap,
  disabled = false,
}: PrimaryMaterialCellProps) {
  const { t } = useLanguage()

  return (
    <TableCell className='py-3'>
      <FormField
        control={form.control}
        name={`items.${index}.materialId`}
        render={({ field }) => (
          <div className='flex flex-col gap-2'>
            <div className='flex flex-col gap-1'>
              <Combobox
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  const material = materialMap.get(value)
                  if (!material) {
                    const error = new Error(`[CRITICAL] Missing material option for id ${value}`)
                    failLoudly(error, 'PrimaryMaterialCell.materialLookup')
                    throw error
                  }
                  form.setValue(`items.${index}.materialName`, material.name)
                  form.setValue(`items.${index}.materialSpec`, material.spec)
                  form.setValue(`items.${index}.unit`, material.uom)
                  form.setValue(`items.${index}.materialType`, material.category)
                  if (typeof material.costPrice === 'number' && !Number.isNaN(material.costPrice)) {
                    form.setValue(`items.${index}.unitPrice`, material.costPrice)
                  }
                }}
                options={sortedMaterials.map((material) => ({
                  label: material.name,
                  value: material.id,
                  keywords: `${material.code} ${material.name} ${material.spec}`,
                  secondaryLabel: material.spec,
                  tertiaryLabel: material.code,
                  usageStats: material.usageStats,
                }))}
                placeholder={t('engineering.bomArchive.itemTable.searchMaterialPlaceholder')}
                className='h-10 rounded-xl border-none bg-muted/30 text-[11px] font-bold text-primary shadow-inner'
                disabled={disabled}
              />
              {form.watch(`items.${index}.materialSpec`) && (
                <span className='truncate px-2 text-[10px] font-black italic leading-none tracking-tight text-emerald-700'>
                  {t('engineering.bomArchive.itemTable.specLabel')}: {form.watch(`items.${index}.materialSpec`)}
                </span>
              )}
            </div>
          </div>
        )}
      />
    </TableCell>
  )
}
