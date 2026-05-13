'use client'

import type { ComponentProps } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { useLanguage } from '@/context/language-provider'
import { type MaterialOption } from '../../../material-archive/data/schema'
import { type BOM } from '../../data/schema'
import { type EnrichedMaterialOption } from '../../hooks/use-enriched-material-options'
import { PrimaryMaterialCell } from './primary-material-cell'

interface BOMItemRowProps {
  form: UseFormReturn<BOM>
  index: number
  materials: EnrichedMaterialOption[]
  materialMap: Map<string, MaterialOption>
  onRemove: (index: number) => void
  measureElement?: (el: HTMLTableRowElement | null) => void
  dataIndex?: number
  canEdit?: boolean
}

export function BOMItemRow({ form, index, materials, materialMap, onRemove, measureElement, dataIndex, canEdit = true }: BOMItemRowProps) {
  const { t } = useLanguage()

  return (
    <TableRow
      ref={measureElement as ComponentProps<'tr'>['ref']}
      data-index={dataIndex}
      className='group border-dashed align-top transition-colors hover:bg-slate-100/50'
    >
      <PrimaryMaterialCell
        form={form}
        index={index}
        sortedMaterials={materials}
        materialMap={materialMap}
        disabled={!canEdit}
      />

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
              disabled={!canEdit}
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
              onChange={(event) => {
                const val = parseFloat(event.target.value) || 0
                field.onChange(val)
                const wastage = form.getValues(`items.${index}.wastagePercent`) || 0
                form.setValue(`items.${index}.standardUsage`, parseFloat((val * (1 + wastage / 100)).toFixed(6)), { shouldDirty: true })
              }}
              disabled={!canEdit}
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
              onChange={(event) => {
                const val = parseFloat(event.target.value) || 0
                field.onChange(val)
                const usage = form.getValues(`items.${index}.unitUsage`) || 0
                form.setValue(`items.${index}.standardUsage`, parseFloat((usage * (1 + val / 100)).toFixed(6)), { shouldDirty: true })
              }}
              disabled={!canEdit}
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
              placeholder={t('engineering.bomArchive.itemTable.memoPlaceholder')}
              disabled={!canEdit}
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
          disabled={!canEdit}
        >
          <Trash2 className='size-4' />
        </Button>
      </TableCell>
    </TableRow>
  )
}
