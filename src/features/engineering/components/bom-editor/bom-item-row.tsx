'use client'

import * as React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { Combobox } from '@/components/ui/combobox'
import { type Material } from '../../../material-archive/data/schema'
import { type BOM, type BOMSubstitute } from '../../data/schema'
import { BOM_SECTION_CATEGORY_MAP } from '../../constants/bom-sections'
import { MaterialUsageService } from '../../services/material-usage-service'

interface BOMItemRowProps {
  form: UseFormReturn<BOM>
  index: number
  materials: Material[]
  onRemove: (index: number) => void
  measureElement?: (el: HTMLElement | null) => void
  dataIndex?: number
}

export function BOMItemRow({ form, index, materials, onRemove, measureElement, dataIndex }: BOMItemRowProps) {
  const [enrichedMaterials, setEnrichedMaterials] = React.useState<any[]>([])
  const currentSection = form.watch(`items.${index}.section`)
  const primaryMaterialId = form.watch(`items.${index}.materialId`)
  const substitutes = form.watch(`items.${index}.substitutes`) || []

  React.useEffect(() => {
    let cancelled = false

    const enrich = async () => {
      const data = await Promise.all(materials.map(async (material) => ({
        ...material,
        usageStats: await MaterialUsageService.getStageUsageStats(material.id),
      })))

      if (!cancelled) {
        setEnrichedMaterials(data)
      }
    }

    enrich()

    return () => {
      cancelled = true
    }
  }, [materials])

  const sortedMaterials = React.useMemo(() => {
    const allowedCategories = BOM_SECTION_CATEGORY_MAP[currentSection] || []

    return enrichedMaterials
      .map((material) => {
        const isRecommended = allowedCategories.includes(material.category)
        return {
          ...material,
          labelSuffix: isRecommended ? ' [Recommended]' : '',
        }
      })
      .sort((a, b) => {
        const aRecommended = allowedCategories.includes(a.category) ? 1 : 0
        const bRecommended = allowedCategories.includes(b.category) ? 1 : 0
        return bRecommended - aRecommended
      })
  }, [currentSection, enrichedMaterials])

  const setSubstitutes = (nextSubstitutes: BOMSubstitute[]) => {
    form.setValue(`items.${index}.substitutes`, nextSubstitutes as any, {
      shouldDirty: true,
      shouldTouch: true,
    })
  }

  const addSubstitute = () => {
    setSubstitutes([
      ...substitutes,
      {
        id: '',
        materialId: '',
        priority: substitutes.length + 1,
        conversionRate: 1,
        notes: '',
      },
    ])
  }

  const removeSubstitute = (substituteIndex: number) => {
    setSubstitutes(
      substitutes
        .filter((_: BOMSubstitute, idx: number) => idx !== substituteIndex)
        .map((substitute: BOMSubstitute, idx: number) => ({
          ...substitute,
          priority: idx + 1,
        }))
    )
  }

  const updateSubstitute = (substituteIndex: number, patch: Partial<BOMSubstitute>) => {
    setSubstitutes(
      substitutes.map((substitute: BOMSubstitute, idx: number) =>
        idx === substituteIndex ? { ...substitute, ...patch } : substitute
      )
    )
  }

  return (
    <TableRow
      ref={measureElement}
      data-index={dataIndex}
      className='group border-dashed align-top transition-colors hover:bg-slate-100/50'
    >
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
                    const material = materials.find((entry) => entry.id === value)
                    if (material) {
                      form.setValue(`items.${index}.materialName`, material.name)
                      form.setValue(`items.${index}.materialSpec`, material.spec || '')
                      form.setValue(`items.${index}.unit`, material.uom)
                      if (material.costPrice) {
                        form.setValue(`items.${index}.unitPrice`, material.costPrice)
                      }
                    }
                  }}
                  options={sortedMaterials.map((material) => ({
                    label: `${material.name}${material.labelSuffix}`,
                    value: material.id,
                    keywords: `${material.code} ${material.name} ${material.spec}`,
                    secondaryLabel: material.spec || 'No spec',
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
                    onClick={addSubstitute}
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
                    {substitutes.map((substitute: BOMSubstitute, substituteIndex: number) => (
                      <div
                        key={`${substitute.id || 'new'}-${substituteIndex}`}
                        className='grid grid-cols-12 gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-2'
                      >
                        <div className='col-span-12 sm:col-span-6'>
                          <Combobox
                            value={substitute.materialId}
                            onValueChange={(value) => updateSubstitute(substituteIndex, { materialId: value })}
                            options={sortedMaterials
                              .filter((material) => material.id !== primaryMaterialId)
                              .map((material) => ({
                                label: material.name,
                                value: material.id,
                                keywords: `${material.code} ${material.name} ${material.spec}`,
                                secondaryLabel: material.spec || 'No spec',
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
                            onChange={(event) => updateSubstitute(substituteIndex, { priority: Number(event.target.value) || 1 })}
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
                            onChange={(event) => updateSubstitute(substituteIndex, { conversionRate: Number(event.target.value) || 1 })}
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
                            onClick={() => removeSubstitute(substituteIndex)}
                          >
                            <X className='size-4' />
                          </Button>
                        </div>
                        <div className='col-span-12 sm:col-span-11'>
                          <Input
                            value={substitute.notes ?? ''}
                            onChange={(event) => updateSubstitute(substituteIndex, { notes: event.target.value })}
                            className='h-9 rounded-xl border-none bg-white text-[11px] shadow-inner'
                            placeholder='Substitute note / trigger condition...'
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        />
      </TableCell>

      <TableCell className='px-1 py-3'>
        <FormField
          control={form.control}
          name={`items.${index}.unitPrice`}
          render={({ field }) => (
            <Input
              type='number'
              className='h-10 rounded-xl border-none bg-muted/30 px-2 text-[11px] font-bold shadow-inner'
              {...field}
              onChange={(event) => field.onChange(parseFloat(event.target.value))}
            />
          )}
        />
      </TableCell>

      <TableCell className='px-1 py-3'>
        <FormField
          control={form.control}
          name={`items.${index}.unitUsage`}
          render={({ field }) => (
            <Input
              type='number'
              step='0.000001'
              className='h-10 rounded-xl border-none bg-muted/30 px-2 text-[11px] font-bold text-primary shadow-inner focus:ring-2 focus:ring-primary/20'
              {...field}
              onChange={(event) => field.onChange(parseFloat(event.target.value))}
            />
          )}
        />
      </TableCell>

      <TableCell className='px-1 py-3'>
        <FormField
          control={form.control}
          name={`items.${index}.wastagePercent`}
          render={({ field }) => (
            <Input
              type='number'
              className='h-10 rounded-xl bg-white px-1 text-center text-[11px] font-bold shadow-inner'
              {...field}
              onChange={(event) => field.onChange(parseFloat(event.target.value))}
            />
          )}
        />
      </TableCell>

      <TableCell className='px-1 py-3'>
        <FormField
          control={form.control}
          name={`items.${index}.standardUsage`}
          render={({ field }) => (
            <Input
              type='number'
              className='h-10 rounded-xl border-none bg-slate-100 px-2 text-[11px] font-black text-blue-800 shadow-inner'
              {...field}
              readOnly
            />
          )}
        />
      </TableCell>

      <TableCell className='px-1 py-3'>
        <FormField
          control={form.control}
          name={`items.${index}.supplyChannel`}
          render={({ field }) => (
            <Input
              className='h-10 rounded-xl bg-white px-2 text-[11px] shadow-inner'
              {...field}
              placeholder='Vendor / source / memo...'
            />
          )}
        />
      </TableCell>

      <TableCell className='px-1 py-3 text-right'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-8 rounded-full opacity-20 shadow-sm transition-all hover:bg-rose-600 hover:text-white group-hover:opacity-100'
          onClick={() => onRemove(index)}
        >
          <Trash2 className='size-4' />
        </Button>
      </TableCell>
    </TableRow>
  )
}
