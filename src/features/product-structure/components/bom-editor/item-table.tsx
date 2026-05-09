'use client'

import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Plus } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type MaterialOption } from '../../../material-archive/data/schema'
import { type BOM } from '../../data/schema'
import { useEnrichedMaterialOptions } from '../../hooks/use-enriched-material-options'
import { BOMItemRow } from './bom-item-row'

interface ItemTableProps {
  form: UseFormReturn<BOM>
  renderFields: Array<{ field: { id: string }; index: number }>
  materials: MaterialOption[]
  onRemove: (index: number) => void
  onAdd: () => void
}

export function ItemTable({ form, renderFields, materials, onRemove, onAdd }: ItemTableProps) {
  const { t } = useLanguage()
  const parentRef = React.useRef<HTMLDivElement>(null)
  const count = renderFields.length + 1
  const { enrichedMaterials, materialMap } = useEnrichedMaterialOptions(materials)

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 136,
    overscan: 5,
  })

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className='custom-scrollbar relative z-0 h-full min-h-0 flex-1 overflow-auto rounded-b-xl border-b border-muted bg-slate-50/50'
    >
      <Table>
        <TableHeader className='sticky top-0 z-20 bg-slate-900 shadow-md'>
          <TableRow className='h-10 border-none hover:bg-transparent'>
            <TableHead className='min-w-[320px] py-0 text-[10px] font-black uppercase tracking-widest text-white'>
              {t('engineering.bomArchive.itemTable.primaryMaterial')}
            </TableHead>
            <TableHead className='w-[78px] py-0 text-[10px] font-black uppercase tracking-widest text-white'>
              {t('engineering.bomArchive.itemTable.price')}
            </TableHead>
            <TableHead className='w-[86px] bg-blue-500/10 py-0 text-[10px] font-black uppercase tracking-widest text-blue-300'>
              {t('engineering.bomArchive.itemTable.unitUsage')}
            </TableHead>
            <TableHead className='w-[64px] py-0 text-center text-[10px] font-black uppercase tracking-widest text-white'>
              {t('engineering.bomArchive.itemTable.loss')}
            </TableHead>
            <TableHead className='w-[92px] bg-blue-500/10 py-0 text-[10px] font-black uppercase tracking-widest text-blue-300'>
              {t('engineering.bomArchive.itemTable.stdUsage')}
            </TableHead>
            <TableHead className='w-[180px] py-0 text-[10px] font-black uppercase tracking-widest text-white'>
              {t('engineering.bomArchive.itemTable.memoSource')}
            </TableHead>
            <TableHead className='w-[40px] py-0 text-right text-[10px] font-black uppercase tracking-widest text-white'>
              {t('engineering.bomArchive.itemTable.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className='bg-white/40'>
          {virtualItems.length > 0 && (
            <tr style={{ height: `${virtualItems[0].start}px` }}>
              <td colSpan={7} className='border-none p-0' />
            </tr>
          )}

          {virtualItems.map((virtualRow) => {
            const isLastItem = virtualRow.index === renderFields.length

            if (isLastItem) {
              return (
                <TableRow
                  key='add-row'
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className='group/add-row h-[56px] cursor-pointer border-t-2 border-dashed border-muted transition-all hover:bg-blue-600'
                  onClick={onAdd}
                >
                  <TableCell colSpan={7} className='px-6 py-4'>
                    {renderFields.length === 0 ? (
                      <div className='flex flex-col items-center justify-center gap-4 py-16 transition-transform group-hover/add-row:scale-[1.01]'>
                        <div className='flex size-14 items-center justify-center rounded-[20px] border-4 border-white bg-blue-600 text-white shadow-xl transition-all group-hover/add-row:rotate-0 rotate-3'>
                          <Plus className='size-8 stroke-3' />
                        </div>
                        <div className='text-center'>
                          <p className='text-[11px] font-black uppercase tracking-widest text-slate-800 transition-colors group-hover/add-row:text-white'>
                            {t('engineering.bomArchive.itemTable.initialize')}
                          </p>
                          <p className='mt-1 text-[9px] font-bold uppercase tracking-widest italic text-muted-foreground/60 transition-colors group-hover/add-row:text-blue-100'>
                            {t('engineering.bomArchive.itemTable.initializeHint')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className='flex items-center gap-4 text-blue-600 transition-all group-hover/add-row:text-white'>
                        <div className='flex size-6 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-md'>
                          <Plus className='size-4 stroke-3' />
                        </div>
                        <span className='text-[9px] font-black uppercase tracking-widest'>
                          {t('engineering.bomArchive.itemTable.append')}
                        </span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            }

            const renderField = renderFields[virtualRow.index]

            return (
              <BOMItemRow
                key={renderField.field.id}
                form={form}
                index={renderField.index}
                materials={enrichedMaterials}
                materialMap={materialMap}
                onRemove={onRemove}
                measureElement={virtualizer.measureElement}
                dataIndex={virtualRow.index}
              />
            )
          })}

          {virtualItems.length > 0 && (
            <tr
              style={{
                height: `${virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end}px`,
              }}
            >
              <td colSpan={7} className='border-none p-0' />
            </tr>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
