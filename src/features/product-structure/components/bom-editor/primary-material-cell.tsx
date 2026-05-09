'use client'

import type { UseFormReturn } from 'react-hook-form'
import { Combobox } from '@/components/ui/combobox'
import { FormField } from '@/components/ui/form'
import { TableCell } from '@/components/ui/table'
import { failLoudly } from '@/lib/safe-catch'
import { type MaterialOption } from '../../../material-archive/data/schema'
import { type EnrichedMaterialOption } from '../../hooks/use-enriched-material-options'
import { type BOM, type BOMSubstitute } from '../../data/schema'
import { type BOMSubstitutePatch } from '../../mutation-types'
import { SubstituteEditor } from './substitute-editor'

interface PrimaryMaterialCellProps {
  form: UseFormReturn<BOM>
  index: number
  sortedMaterials: EnrichedMaterialOption[]
  materialMap: Map<string, MaterialOption>
  primaryMaterialId: string
  substitutes: BOMSubstitute[]
  onAddSubstitute: () => void
  onRemoveSubstitute: (substituteIndex: number) => void
  onUpdateSubstitute: (substituteIndex: number, patch: BOMSubstitutePatch) => void
}

export function PrimaryMaterialCell({
  form,
  index,
  sortedMaterials,
  materialMap,
  primaryMaterialId,
  substitutes,
  onAddSubstitute,
  onRemoveSubstitute,
  onUpdateSubstitute,
}: PrimaryMaterialCellProps) {
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
                placeholder='Search material...'
                className='h-10 rounded-xl border-none bg-muted/30 text-[11px] font-bold text-primary shadow-inner'
              />
              {form.watch(`items.${index}.materialSpec`) && (
                <span className='truncate px-2 text-[10px] font-black italic leading-none tracking-tight text-emerald-700'>
                  SPEC: {form.watch(`items.${index}.materialSpec`)}
                </span>
              )}
            </div>

            <SubstituteEditor
              sortedMaterials={sortedMaterials}
              primaryMaterialId={primaryMaterialId}
              substitutes={substitutes}
              onAddSubstitute={onAddSubstitute}
              onRemoveSubstitute={onRemoveSubstitute}
              onUpdateSubstitute={onUpdateSubstitute}
            />
          </div>
        )}
      />
    </TableCell>
  )
}
