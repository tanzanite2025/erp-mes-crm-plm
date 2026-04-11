'use client'

import { useMemo } from 'react'
import { 
    Table, 
    TableBody, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table'
import { type BOMItem } from '../data/schema'
import { Badge } from '@/components/ui/badge'
import { getMaterialCategoryOptions } from '@/features/material-archive/data/material-category-options'
import { type MaterialOption } from '../../material-archive/data/schema'
import { resolveMaterialCategoryLabel } from '@/features/material-archive/utils/material-mgmt-utils'
import { Layers, Database, ChevronRight, Hash } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

interface BOMDetailTableProps {
    items: BOMItem[]
    materials?: MaterialOption[]
}

export function BOMDetailTable({ items, materials = [] }: BOMDetailTableProps) {
    const { t, locale } = useLanguage()
    const materialCategoryOptions = useMemo(() => getMaterialCategoryOptions(locale), [locale])
    const materialMap = useMemo(() => new Map(materials.map((material) => [material.id, material])), [materials])
    // 按工段分组
    const groupedItems: Record<string, BOMItem[]> = items.reduce((acc, item) => {
        const section = item.section || t('engineering.productMgmt.bom.unclassified')
        if (!acc[section]) acc[section] = []
        acc[section].push(item)
        return acc
    }, {} as Record<string, BOMItem[]>)

    const sections = Object.keys(groupedItems)

    return (
        <div className='space-y-4'>
            {/* 1. 移动端视图 (Mobile < 768px): 分段式卡片流 */}
            <div className='flex flex-col gap-6 md:hidden'>
                {sections.map((section) => (
                    <div key={section} className='space-y-3'>
                        {/* 工序分组标题 */}
                        <div className='flex items-center gap-2 px-1'>
                            <div className='h-4 w-1 bg-blue-600 rounded-full' />
                            <h4 className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 italic'>
                                {t('engineering.productMgmt.bom.processNode')}: <span className='text-blue-600'>{section}</span>
                            </h4>
                        </div>

                        {/* 物料卡片列表 */}
                        <div className='space-y-3'>
                            {groupedItems[section].map((item) => {
                                const material = materialMap.get(item.materialId)
                                const materialType =
                                    resolveMaterialCategoryLabel(material?.category, materialCategoryOptions) ||
                                    material?.category ||
                                    item.materialType ||
                                    t('engineering.productMgmt.bom.auxiliary')

                                return (
                                    <div 
                                        key={item.id} 
                                        className='bg-white rounded-[24px] border border-dashed border-muted p-4 shadow-sm space-y-3 active:scale-[0.98] transition-all'
                                    >
                                        {/* 第一行: 品名与类型 */}
                                        <div className='flex justify-between items-start gap-3'>
                                            <div className='flex flex-col gap-0.5 overflow-hidden'>
                                                <span className='font-black text-xs text-slate-800 uppercase tracking-tight truncate'>
                                                    {item.materialName || t('engineering.productMgmt.bom.unknown')}
                                                </span>
                                                <span className='font-mono text-[8px] text-muted-foreground/40 uppercase tracking-widest truncate'>
                                                    {item.materialId}
                                                </span>
                                            </div>
                                            <Badge variant='outline' className='shrink-0 text-[7px] font-black uppercase bg-muted/20 border-none h-4 px-2 rounded-full text-slate-500'>
                                                {materialType}
                                            </Badge>
                                        </div>

                                        {/* 第二行: 用量核心数据 */}
                                        <div className='grid grid-cols-2 gap-2 bg-blue-600/5 rounded-xl p-3 border border-blue-600/10'>
                                            <div className='flex flex-col'>
                                                <span className='text-[7px] font-black text-blue-800/40 uppercase tracking-widest'>{t('engineering.productMgmt.bom.unitUsage')}</span>
                                                <div className='flex items-baseline gap-1'>
                                                    <span className='text-sm font-black italic tabular-nums text-blue-700'>{item.unitUsage?.toFixed(4)}</span>
                                                    <span className='text-[7px] font-black text-blue-800/40 uppercase'>{item.unit}</span>
                                                </div>
                                            </div>
                                            <div className='flex flex-col border-l border-blue-600/10 pl-3'>
                                                <span className='text-[7px] font-black text-blue-800/40 uppercase tracking-widest'>{t('engineering.productMgmt.bom.stdUsage')}</span>
                                                <div className='flex items-baseline gap-1'>
                                                    <span className='text-sm font-black italic tabular-nums text-blue-700'>
                                                        {(item.standardUsage || 0).toFixed(4)}
                                                    </span>
                                                    <span className='text-[7px] font-black text-blue-800/40 uppercase'>{item.unit}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 第三行: 辅助属性 (单价, 规格, 损耗) */}
                                        <div className='grid grid-cols-2 gap-y-2 gap-x-4 px-1'>
                                            <div className='flex items-center gap-2 overflow-hidden'>
                                                <Layers className='size-2.5 text-muted-foreground/30' />
                                                <span className='text-[9px] font-black text-muted-foreground/60 uppercase tracking-tight truncate'>{item.materialSpec || '-'}</span>
                                            </div>
                                            <div className='flex items-center gap-2'>
                                                <Hash className='size-2.5 text-muted-foreground/30' />
                                                <span className='text-[9px] font-black text-muted-foreground/60 uppercase tracking-tight'>{t('engineering.productMgmt.bom.loss')}: {item.wastagePercent}%</span>
                                            </div>
                                            <div className='flex items-center gap-2'>
                                                <ChevronRight className='size-2.5 text-muted-foreground/30' />
                                                <span className='text-[9px] font-black text-muted-foreground/60 uppercase tracking-tight'>{t('engineering.productMgmt.bom.price')}: ¥{item.unitPrice?.toFixed(2)}</span>
                                            </div>
                                            <div className='flex items-center gap-2'>
                                                <Database className='size-2.5 text-muted-foreground/30' />
                                                <span className='text-[9px] font-black text-muted-foreground/60 uppercase tracking-tight truncate'>{t('engineering.productMgmt.bom.path')}: {item.supplyChannel || 'DEFAULT'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}

                {items.length === 0 && (
                    <div className='h-48 text-center bg-muted/5 rounded-[32px] border border-dashed border-muted/50 flex flex-col items-center justify-center gap-4 opacity-20'>
                         <Layers className="size-16" />
                         <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">{t('engineering.productMgmt.bom.noData')}</p>
                    </div>
                )}
            </div>

            {/* 2. 桌面端视图 (Desktop >= 768px): */}
            <div className='hidden md:block'>
                <Table>
                    <TableHeader className='bg-muted/30 border-b border-dashed border-muted'>
                        <TableRow className='hover:bg-transparent'>
                            <TableHead className='w-[100px] text-center border-r font-black text-[10px] uppercase tracking-widest text-muted-foreground/40 italic'>{t('engineering.productMgmt.bom.headerProcess')}</TableHead>
                            <TableHead className='w-[120px] font-black text-[10px] uppercase tracking-widest text-muted-foreground/40'>{t('engineering.productMgmt.bom.headerCode')}</TableHead>
                            <TableHead className='min-w-[150px] font-black text-[10px] uppercase tracking-widest text-muted-foreground/40'>{t('engineering.productMgmt.bom.headerName')}</TableHead>
                            <TableHead className='min-w-[150px] font-black text-[10px] uppercase tracking-widest text-muted-foreground/40'>{t('engineering.productMgmt.bom.headerSpec')}</TableHead>
                            <TableHead className='w-[60px] text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground/40'>{t('engineering.productMgmt.bom.headerUnit')}</TableHead>
                            <TableHead className='w-[80px] text-right font-black text-[10px] uppercase tracking-widest text-muted-foreground/40'>{t('engineering.productMgmt.bom.headerPrice')}</TableHead>
                            <TableHead className='w-[100px] text-right font-black text-[10px] uppercase tracking-widest text-blue-600 italic bg-blue-500/5'>{t('engineering.productMgmt.bom.headerUsage')}</TableHead>
                            <TableHead className='w-[80px] text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground/40'>{t('engineering.productMgmt.bom.headerLoss')}</TableHead>
                            <TableHead className='w-[100px] text-right font-black text-[10px] uppercase tracking-widest bg-blue-600/10 text-blue-700 italic border-l border-dashed border-blue-200'>{t('engineering.productMgmt.bom.headerStdUsage')}</TableHead>
                            <TableHead className='w-[100px] text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground/40'>{t('engineering.productMgmt.bom.headerType')}</TableHead>
                            <TableHead className='w-[100px] text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground/40'>{t('engineering.productMgmt.bom.headerChannel')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sections.map((section) => (
                            groupedItems[section].map((item, idx) => (
                                <tr key={item.id} className='hover:bg-blue-500/5 transition-all group border-b border-dashed border-muted/30 last:border-none'>
                                    {idx === 0 && (
                                        <td 
                                            rowSpan={groupedItems[section].length} 
                                            className='bg-blue-600 font-black text-white text-center border-r border-blue-700/50 align-middle text-[11px] uppercase tracking-[0.3em] shadow-[inset_-4px_0_8px_rgba(0,0,0,0.1)]'
                                        >
                                            <div className='[writing-mode:vertical-rl] mx-auto tracking-[0.4em] transform rotate-180 italic'>
                                                {section}
                                            </div>
                                        </td>
                                    )}
                                    <td className='px-4 py-3 font-mono text-[9px] text-muted-foreground/40 uppercase tracking-widest'>{item.materialId}</td>
                                    <td className='px-4 py-3'>
                                        <div className='font-black text-[12px] text-slate-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors truncate max-w-[180px]'>{item.materialName || '-'}</div>
                                    </td>
                                    <td className='px-4 py-3 text-[10px] font-black text-muted-foreground/50 uppercase tracking-tighter truncate max-w-[180px]'>{item.materialSpec || '-'}</td>
                                    <td className='px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest'>{item.unit}</td>
                                    <td className='px-4 py-3 text-right text-[10px] font-mono font-bold text-slate-500'>¥{item.unitPrice?.toFixed(2)}</td>
                                    <td className='px-4 py-3 text-right text-[12px] font-black text-blue-600 italic tabular-nums bg-blue-500/5'>{item.unitUsage?.toFixed(6)}</td>
                                    <td className='px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase'>
                                        <Badge variant='outline' className='text-[8px] h-3.5 px-1 font-black bg-muted/20 border-none rounded-full'>{item.wastagePercent}%</Badge>
                                    </td>
                                    <td className='px-4 py-3 text-right text-[12px] font-black text-blue-700 bg-blue-600/10 italic tabular-nums border-l border-dashed border-blue-200'>
                                        {(item.standardUsage || 0).toFixed(6)}
                                    </td>
                                    <td className='px-4 py-3 text-center'>
                                        <Badge variant='outline' className='text-[8px] font-black uppercase tracking-widest h-4 px-2 border-none bg-slate-100 text-slate-500 rounded-full shrink-0'>
                                            {(() => {
                                                const material = materialMap.get(item.materialId)
                                                if (material) {
                                                    return (
                                                        resolveMaterialCategoryLabel(material.category, materialCategoryOptions) ||
                                                        material.category ||
                                                        t('engineering.productMgmt.bom.auxiliary')
                                                    )
                                                }
                                                return item.materialType || t('engineering.productMgmt.bom.auxiliary')
                                            })()}
                                        </Badge>
                                    </td>
                                    <td className='px-4 py-3 text-center text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest truncate max-w-[100px]'>{item.supplyChannel || '-'}</td>
                                </tr>
                            ))
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
