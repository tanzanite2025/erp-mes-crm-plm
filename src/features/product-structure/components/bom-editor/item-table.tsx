'use client'

import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, Plus } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
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
import { type BOMWorkspaceNode } from '../../hooks/use-bom-workspace-projection'
import { BOMItemRow } from './bom-item-row'

interface ItemTableProps {
  form: UseFormReturn<BOM>
  nodes: BOMWorkspaceNode[]
  materials: MaterialOption[]
  onRemove: (index: number) => void
  onBranchToggle?: (branchKey: string) => void
  onAdd: (sectionCode?: string) => void
}

export function ItemTable({ form, nodes, materials, onRemove, onBranchToggle, onAdd }: ItemTableProps) {
  const { t } = useLanguage()
  const parentRef = React.useRef<HTMLDivElement>(null)
  const count = nodes.length
  const { enrichedMaterials, materialMap } = useEnrichedMaterialOptions(materials)

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const node = nodes[index]
      if (!node) {
        return 136
      }

      if (node.nodeType === 'branch') {
        return 60
      }

      if (node.nodeType === 'synthetic') {
        return node.syntheticKind === 'group-empty' ? 156 : 60
      }

      return 136
    },
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
            const node = nodes[virtualRow.index]

            if (node.nodeType === 'branch') {
              return (
                <TableRow
                  key={node.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className='border-dashed bg-muted/10 hover:bg-transparent'
                >
                  <TableCell colSpan={7} className='px-0 py-0'>
                    <button
                      type='button'
                      className='flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-primary/5 sm:px-4'
                      style={{ paddingLeft: `${20 + node.depth * 20}px` }}
                      onClick={() => onBranchToggle?.(node.sourceNodeId)}
                    >
                      <div className='flex size-8 items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-primary/10 text-primary'>
                        <ChevronDown className={cn('size-4 transition-transform duration-300', !node.isExpanded && '-rotate-90')} />
                      </div>

                      <div className='min-w-0 flex-1'>
                        <div className='text-sm font-black uppercase tracking-tight italic text-slate-900'>
                          {node.label}
                        </div>
                      </div>

                      <div className='flex items-center gap-1.5'>
                        <div className='flex h-5 items-center rounded-full border border-dashed border-blue-300 bg-blue-500/10 px-2 text-[8px] font-mono uppercase tracking-widest text-blue-700'>
                          {node.childCount} {t('engineering.bomArchive.summary.itemsUnit')}
                        </div>
                        <div className='flex h-5 items-center rounded-full border border-dashed border-emerald-300 bg-emerald-500/10 px-2 text-[8px] font-mono uppercase tracking-widest text-emerald-700'>
                          {node.sectionCost.toFixed(2)}
                        </div>
                      </div>
                    </button>
                  </TableCell>
                </TableRow>
              )
            }

            if (node.nodeType === 'synthetic') {
              const isEmptyState = node.syntheticKind === 'group-empty'

              return (
                <TableRow
                  key={node.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className='group/add-row h-[52px] cursor-pointer border-t-2 border-dashed border-muted transition-all hover:bg-blue-600'
                  onClick={() => onAdd(node.sectionCode)}
                >
                  <TableCell colSpan={7} className='px-6 py-3' style={{ paddingLeft: `${28 + node.depth * 20}px` }}>
                    {isEmptyState ? (
                      <div className='flex flex-col items-center justify-center gap-3 py-10 transition-transform group-hover/add-row:scale-[1.01]'>
                        <div className='flex size-12 items-center justify-center rounded-[18px] border-[3px] border-white bg-blue-600 text-white shadow-xl transition-all group-hover/add-row:rotate-0 rotate-3'>
                          <Plus className='size-7 stroke-3' />
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
                      <div className='flex items-center gap-3 text-blue-600 transition-all group-hover/add-row:text-white'>
                        <div className='flex size-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-md'>
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

            const leafNode = node

            return (
              <BOMItemRow
                key={leafNode.fieldId}
                form={form}
                index={leafNode.index}
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
