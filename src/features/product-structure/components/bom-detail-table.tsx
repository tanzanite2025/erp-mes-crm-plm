'use client'

import { useMemo } from 'react'
import { Layers, Database, ChevronRight, Hash } from 'lucide-react'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getMaterialCategoryOptions } from '@/features/material-archive/data/material-category-options'
import { resolveMaterialCategoryLabel } from '@/features/material-archive/utils/material-mgmt-utils'
import { type MaterialOption } from '../../material-archive/data/schema'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOMItem } from '../data/schema'
import { resolveBOMSectionLabel } from '../utils/bom-section-utils'

interface BOMDetailTableProps {
  items: BOMItem[]
  materials?: MaterialOption[]
  sections?: BOMSectionOption[]
}

function requireString(value: string | undefined, context: string) {
  if (!value) {
    const error = new Error(`[CRITICAL] Missing ${context}`)
    failLoudly(error, 'BOMDetailTable.requireString')
    throw error
  }
  return value
}

function requireNumber(value: number | undefined, context: string) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    const error = new Error(`[CRITICAL] Missing ${context}`)
    failLoudly(error, 'BOMDetailTable.requireNumber')
    throw error
  }
  return value
}

export function BOMDetailTable({
  items,
  materials,
  sections: sectionOptions = [],
}: BOMDetailTableProps) {
  if (!materials) {
    const error = new Error(
      '[CRITICAL] Missing material options for BOM detail table'
    )
    failLoudly(error, 'BOMDetailTable.materials')
    throw error
  }

  const { t, locale } = useLanguage()
  const materialCategoryOptions = useMemo(
    () => getMaterialCategoryOptions(locale),
    [locale]
  )
  const materialMap = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials]
  )
  // 按工段分组
  const groupedItems: Record<string, BOMItem[]> = items.reduce(
    (acc, item) => {
      const section = requireString(item.section, 'BOM section')
      if (!acc[section]) acc[section] = []
      acc[section].push(item)
      return acc
    },
    {} as Record<string, BOMItem[]>
  )

  const sectionKeys = Object.keys(groupedItems)

  return (
    <div className='space-y-4'>
      {/* 1. 移动端视图 (Mobile < 768px): 分段式卡片流 */}
      <div className='flex flex-col gap-6 md:hidden'>
        {sectionKeys.map((section) => (
          <div key={section} className='space-y-3'>
            {/* 工序分组标题 */}
            <div className='flex items-center gap-2 px-1'>
              <div className='h-4 w-1 rounded-full bg-amber-600' />
              <h4 className='text-[10px] font-black tracking-[0.2em] text-slate-800 uppercase italic'>
                {t('engineering.productMgmt.bom.processNode')}:{' '}
                <span className='text-amber-600'>
                  {resolveBOMSectionLabel(sectionOptions, section, section)}
                </span>
              </h4>
            </div>

            {/* 物料卡片列表 */}
            <div className='space-y-3'>
              {(groupedItems[section] || []).map((item) => {
                const materialId = requireString(
                  item.materialId,
                  'BOM materialId'
                )
                const material = materialMap.get(materialId)
                if (!material) {
                  const error = new Error(
                    `[CRITICAL] Missing material master for ${materialId}`
                  )
                  failLoudly(error, 'BOMDetailTable.materialLookup')
                  throw error
                }
                const materialType =
                  resolveMaterialCategoryLabel(
                    material.category,
                    materialCategoryOptions
                  ) || material.category
                if (!materialType) {
                  const error = new Error(
                    `[CRITICAL] Missing material category for ${materialId}`
                  )
                  failLoudly(error, 'BOMDetailTable.materialCategory')
                  throw error
                }

                return (
                  <div
                    key={item.id}
                    className='space-y-3 rounded-[24px] border border-dashed border-muted bg-white p-4 shadow-sm transition-all active:scale-[0.98]'
                  >
                    {/* 第一行: 品名与类型 */}
                    <div className='flex items-start justify-between gap-3'>
                      <div className='flex flex-col gap-0.5 overflow-hidden'>
                        <span className='truncate text-xs font-black tracking-tight text-slate-800 uppercase'>
                          {item.materialName}
                        </span>
                        <span className='truncate font-mono text-[8px] tracking-widest text-muted-foreground/40 uppercase'>
                          {materialId}
                        </span>
                      </div>
                      <Badge
                        variant='outline'
                        className='h-4 shrink-0 rounded-full border-none bg-muted/20 px-2 text-[7px] font-black text-slate-500 uppercase'
                      >
                        {materialType}
                      </Badge>
                    </div>

                    {/* 第二行: 用量核心数据 */}
                    <div className='grid grid-cols-2 gap-2 rounded-xl border border-amber-500/10 bg-amber-500/5 p-3'>
                      <div className='flex flex-col'>
                        <span className='text-[7px] font-black tracking-widest text-amber-800/40 uppercase'>
                          {t('engineering.productMgmt.bom.unitUsage')}
                        </span>
                        <div className='flex items-baseline gap-1'>
                          <span className='text-sm font-black text-amber-700 italic tabular-nums'>
                            {requireNumber(item.unitUsage, 'unitUsage').toFixed(
                              4
                            )}
                          </span>
                          <span className='text-[7px] font-black text-amber-800/40 uppercase'>
                            {requireString(item.unit, 'unit')}
                          </span>
                        </div>
                      </div>
                      <div className='flex flex-col border-l border-amber-500/10 pl-3'>
                        <span className='text-[7px] font-black tracking-widest text-amber-800/40 uppercase'>
                          {t('engineering.productMgmt.bom.stdUsage')}
                        </span>
                        <div className='flex items-baseline gap-1'>
                          <span className='text-sm font-black text-amber-700 italic tabular-nums'>
                            {requireNumber(
                              item.standardUsage,
                              'standardUsage'
                            ).toFixed(4)}
                          </span>
                          <span className='text-[7px] font-black text-amber-800/40 uppercase'>
                            {requireString(item.unit, 'unit')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 第三行: 辅助属性(单价, 规格, 损耗) */}
                    <div className='grid grid-cols-2 gap-x-4 gap-y-2 px-1'>
                      <div className='flex items-center gap-2 overflow-hidden'>
                        <Layers className='size-2.5 text-muted-foreground/30' />
                        <span className='truncate text-[9px] font-black tracking-tight text-muted-foreground/60 uppercase'>
                          {item.materialSpec}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Hash className='size-2.5 text-muted-foreground/30' />
                        <span className='text-[9px] font-black tracking-tight text-muted-foreground/60 uppercase'>
                          {t('engineering.productMgmt.bom.loss')}:{' '}
                          {requireNumber(item.wastagePercent, 'wastagePercent')}
                          %
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <ChevronRight className='size-2.5 text-muted-foreground/30' />
                        <span className='text-[9px] font-black tracking-tight text-muted-foreground/60 uppercase'>
                          {t('engineering.productMgmt.bom.price')}: 楼
                          {requireNumber(item.unitPrice, 'unitPrice').toFixed(
                            2
                          )}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Database className='size-2.5 text-muted-foreground/30' />
                        <span className='truncate text-[9px] font-black tracking-tight text-muted-foreground/60 uppercase'>
                          {t('engineering.productMgmt.bom.path')}:{' '}
                          {item.supplyChannel}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className='flex h-48 flex-col items-center justify-center gap-4 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 text-center opacity-20'>
            <Layers className='size-16' />
            <p className='text-[11px] font-black tracking-[0.3em] text-muted-foreground uppercase italic'>
              {t('engineering.productMgmt.bom.noData')}
            </p>
          </div>
        )}
      </div>

      {/* 2. 桌面端视图 (Desktop >= 768px): */}
      <div className='hidden md:block'>
        <Table>
          <TableHeader className='border-b border-dashed border-muted bg-muted/30'>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='w-[100px] border-r text-center text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
                {t('engineering.productMgmt.bom.headerProcess')}
              </TableHead>
              <TableHead className='w-[120px] text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('engineering.productMgmt.bom.headerCode')}
              </TableHead>
              <TableHead className='min-w-[150px] text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('engineering.productMgmt.bom.headerName')}
              </TableHead>
              <TableHead className='min-w-[150px] text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('engineering.productMgmt.bom.headerSpec')}
              </TableHead>
              <TableHead className='w-[60px] text-center text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('engineering.productMgmt.bom.headerUnit')}
              </TableHead>
              <TableHead className='w-[80px] text-right text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('engineering.productMgmt.bom.headerPrice')}
              </TableHead>
              <TableHead className='w-[100px] bg-amber-500/5 text-right text-[10px] font-black tracking-widest text-amber-600 uppercase italic'>
                {t('engineering.productMgmt.bom.headerUsage')}
              </TableHead>
              <TableHead className='w-[80px] text-center text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('engineering.productMgmt.bom.headerLoss')}
              </TableHead>
              <TableHead className='w-[100px] border-l border-dashed border-amber-200 bg-amber-500/10 text-right text-[10px] font-black tracking-widest text-amber-700 uppercase italic'>
                {t('engineering.productMgmt.bom.headerStdUsage')}
              </TableHead>
              <TableHead className='w-[100px] text-center text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('engineering.productMgmt.bom.headerType')}
              </TableHead>
              <TableHead className='w-[100px] text-center text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('engineering.productMgmt.bom.headerChannel')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sectionKeys.map((section) =>
              (groupedItems[section] || []).map((item, idx) => {
                const materialId = requireString(
                  item.materialId,
                  'BOM materialId'
                )
                const material = materialMap.get(materialId)
                if (!material) {
                  const error = new Error(
                    `[CRITICAL] Missing material master for ${materialId}`
                  )
                  failLoudly(error, 'BOMDetailTable.materialLookup')
                  throw error
                }
                const materialType =
                  resolveMaterialCategoryLabel(
                    material.category,
                    materialCategoryOptions
                  ) || material.category
                if (!materialType) {
                  const error = new Error(
                    `[CRITICAL] Missing material category for ${materialId}`
                  )
                  failLoudly(error, 'BOMDetailTable.materialCategory')
                  throw error
                }

                return (
                  <tr
                    key={item.id}
                    className='group border-b border-dashed border-muted/30 transition-all last:border-none hover:bg-amber-500/5'
                  >
                    {idx === 0 && (
                      <td
                        rowSpan={(groupedItems[section] || []).length}
                        className='border-r border-amber-700/50 bg-amber-600 text-center align-middle text-[11px] font-black tracking-[0.3em] text-white uppercase shadow-[inset_-4px_0_8px_rgba(0,0,0,0.1)]'
                      >
                        <div className='mx-auto rotate-180 transform tracking-[0.4em] italic [writing-mode:vertical-rl]'>
                          {resolveBOMSectionLabel(
                            sectionOptions,
                            section,
                            section
                          )}
                        </div>
                      </td>
                    )}
                    <td className='px-4 py-3 font-mono text-[9px] tracking-widest text-muted-foreground/40 uppercase'>
                      {materialId}
                    </td>
                    <td className='px-4 py-3'>
                      <div className='max-w-[180px] truncate text-[12px] font-black tracking-tight text-slate-700 uppercase transition-colors group-hover:text-amber-600'>
                        {item.materialName}
                      </div>
                    </td>
                    <td className='max-w-[180px] truncate px-4 py-3 text-[10px] font-black tracking-tighter text-muted-foreground/50 uppercase'>
                      {item.materialSpec}
                    </td>
                    <td className='px-4 py-3 text-center text-[10px] font-black tracking-widest text-slate-400 uppercase'>
                      {requireString(item.unit, 'unit')}
                    </td>
                    <td className='px-4 py-3 text-right font-mono text-[10px] font-bold text-slate-500'>
                      楼{requireNumber(item.unitPrice, 'unitPrice').toFixed(2)}
                    </td>
                    <td className='bg-amber-500/5 px-4 py-3 text-right text-[12px] font-black text-amber-600 italic tabular-nums'>
                      {requireNumber(item.unitUsage, 'unitUsage').toFixed(6)}
                    </td>
                    <td className='px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase'>
                      <Badge
                        variant='outline'
                        className='h-3.5 rounded-full border-none bg-muted/20 px-1 text-[8px] font-black'
                      >
                        {requireNumber(item.wastagePercent, 'wastagePercent')}%
                      </Badge>
                    </td>
                    <td className='border-l border-dashed border-amber-200 bg-amber-500/10 px-4 py-3 text-right text-[12px] font-black text-amber-700 italic tabular-nums'>
                      {requireNumber(
                        item.standardUsage,
                        'standardUsage'
                      ).toFixed(6)}
                    </td>
                    <td className='px-4 py-3 text-center'>
                      <Badge
                        variant='outline'
                        className='h-4 shrink-0 rounded-full border-none bg-slate-100 px-2 text-[8px] font-black tracking-widest text-slate-500 uppercase'
                      >
                        {materialType}
                      </Badge>
                    </td>
                    <td className='max-w-[100px] truncate px-4 py-3 text-center text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                      {item.supplyChannel}
                    </td>
                  </tr>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
