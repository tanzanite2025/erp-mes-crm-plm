'use client'

import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { type BOMSubstitute } from '../../data/schema'
import { type BOMSubstitutePatch } from '../../mutation-types'
import { type EnrichedMaterialOption } from '../../hooks/use-enriched-material-options'

interface SubstituteEditorProps {
  sortedMaterials: EnrichedMaterialOption[]
  primaryMaterialId: string
  substitutes: BOMSubstitute[]
  onAddSubstitute: () => void
  onRemoveSubstitute: (substituteIndex: number) => void
  onUpdateSubstitute: (substituteIndex: number, patch: BOMSubstitutePatch) => void
}

export function SubstituteEditor({
  sortedMaterials,
  primaryMaterialId,
  substitutes,
  onAddSubstitute,
  onRemoveSubstitute,
  onUpdateSubstitute,
}: SubstituteEditorProps) {
  return (
    <div className='rounded-2xl border border-dashed border-slate-200 bg-white/70 p-2 shadow-sm'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <div>
          <p className='text-[9px] font-black uppercase tracking-widest text-slate-500'>Substitutes</p>
          <p className='text-[9px] text-muted-foreground'>Approved replacement materials for this BOM line</p>
        </div>
        <Button
          type='button'
          size='sm'
          variant='outline'
          className='h-7 rounded-full text-[10px] font-black uppercase'
          onClick={onAddSubstitute}
        >
          <Plus className='size-3' /> Add
        </Button>
      </div>

      {substitutes.length === 0 ? (
        <div className='rounded-xl bg-slate-50 px-3 py-2 text-[10px] text-muted-foreground'>
          No substitutes configured.
        </div>
      ) : (
        <div className='space-y-2'>
          {substitutes.map((substitute, substituteIndex) => (
            <div
              key={`${substitute.id || 'new'}-${substituteIndex}`}
              className='grid grid-cols-12 gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-2'
            >
              <div className='col-span-12 sm:col-span-6'>
                <Combobox
                  value={substitute.materialId}
                  onValueChange={(value) => onUpdateSubstitute(substituteIndex, { materialId: value })}
                  options={sortedMaterials
                    .filter((material) => material.id !== primaryMaterialId)
                    .map((material) => ({
                      label: material.name,
                      value: material.id,
                      keywords: `${material.code} ${material.name} ${material.spec}`,
                      secondaryLabel: material.spec,
                      tertiaryLabel: material.code,
                    }))}
                  placeholder='Select substitute...'
                  className='h-9 rounded-xl border-none bg-white text-[11px] font-bold shadow-inner'
                />
              </div>
              <div className='col-span-4 sm:col-span-2'>
                <Input
                  type='number'
                  min='1'
                  step='1'
                  value={substitute.priority ?? substituteIndex + 1}
                  onChange={(event) => onUpdateSubstitute(substituteIndex, { priority: Number(event.target.value) || 1 })}
                  className='h-9 rounded-xl border-none bg-white text-[11px] font-bold shadow-inner'
                  placeholder='Prio'
                />
              </div>
              <div className='col-span-4 sm:col-span-2'>
                <Input
                  type='number'
                  min='0.000001'
                  step='0.000001'
                  value={substitute.conversionRate ?? 1}
                  onChange={(event) => onUpdateSubstitute(substituteIndex, { conversionRate: Number(event.target.value) || 1 })}
                  className='h-9 rounded-xl border-none bg-white text-[11px] font-bold shadow-inner'
                  placeholder='Rate'
                />
              </div>
              <div className='col-span-3 sm:col-span-1'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-9 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600'
                  onClick={() => onRemoveSubstitute(substituteIndex)}
                >
                  <X className='size-4' />
                </Button>
              </div>
              <div className='col-span-12 sm:col-span-11'>
                <Input
                  value={substitute.notes ?? ''}
                  onChange={(event) => onUpdateSubstitute(substituteIndex, { notes: event.target.value })}
                  className='h-9 rounded-xl border-none bg-white text-[11px] shadow-inner'
                  placeholder='Substitute note / trigger condition...'
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
