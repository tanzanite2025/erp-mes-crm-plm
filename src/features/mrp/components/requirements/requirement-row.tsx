'use client'

import { type MaterialRequirement } from '../../data/requirement-schema'
import { SupplyAnalysisDetails } from './supply-analysis-details'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import { TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ArrowRightLeft } from 'lucide-react'

interface RequirementRowProps {
  requirement: MaterialRequirement
}

export function RequirementRow({ requirement }: RequirementRowProps) {
  const { t } = useLanguage()
  const isShortage = requirement.effectiveGap > 0

  return (
    <TableRow className='group hover:bg-muted/5 transition-colors border-b last:border-0 text-left animate-in fade-in duration-500'>
      <TableCell className='w-[100px] min-w-[100px] truncate font-mono text-[10px] font-bold text-muted-foreground/70 pl-6 py-4'>
        {requirement.materialCode}
      </TableCell>
      <TableCell className='w-auto py-4 text-left'>
        <div className='flex flex-col gap-0.5 max-w-[240px] truncate'>
          <span className='text-[12px] font-black leading-tight truncate'>{requirement.materialName}</span>
          <span className='text-[10px] text-muted-foreground/50 font-medium truncate'>{requirement.materialSpec}</span>
        </div>
      </TableCell>
      <TableCell className='w-[90px] min-w-[90px] text-right py-4'>
        <span className='text-[12px] font-bold text-slate-800 tabular-nums'>
          {requirement.totalRequired.toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
          <span className='text-[9px] ml-0.5 text-muted-foreground/50 font-medium'>{requirement.unit}</span>
        </span>
      </TableCell>
      <TableCell className='w-[90px] min-w-[90px] text-right py-4'>
        <div className='flex flex-col items-end'>
          <span className='text-[12px] font-bold text-slate-800 tabular-nums'>
            {requirement.usableStock.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            <span className='text-[9px] ml-0.5 text-muted-foreground/50 font-medium'>{requirement.unit}</span>
          </span>
          <span className='text-[8px] text-muted-foreground/40 font-bold'>
            {t('trading.requirements.list.usableStockHint', {
              inventory: requirement.inventoryQty,
              locked: requirement.lockedQty,
            })}
          </span>
        </div>
      </TableCell>
      <TableCell className='w-[200px] min-w-[200px] py-4 px-4 bg-muted/5'>
        <SupplyAnalysisDetails item={requirement} />
      </TableCell>
      <TableCell className='w-[110px] min-w-[110px] text-right py-4 bg-slate-50/10'>
        {isShortage ? (
          <div className='flex flex-col items-end'>
            <span className='text-[14px] font-black text-rose-600 tabular-nums tracking-tighter'>
              -{requirement.effectiveGap.toLocaleString(undefined, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              <span className='text-[10px] ml-0.5 font-bold'>{requirement.unit}</span>
            </span>
            {requirement.packaging && (
              <div className='text-[9px] font-bold text-amber-600/80 bg-amber-50 px-1 rounded border border-amber-100/50 mt-0.5 shadow-sm'>
                {t('trading.requirements.list.packagingAtLeast', {
                  count: requirement.packaging.packQty,
                  unit: requirement.packaging.packUnit,
                })}
              </div>
            )}
            <div className='flex items-center gap-0.5 text-[8px] font-black text-rose-400 uppercase mt-1'>
              <AlertTriangle className='size-2' />
              {t('trading.requirements.list.needPurchase')}
            </div>
          </div>
        ) : (
          <Badge variant='outline' className='text-[10px] font-black px-1.5 py-0 rounded bg-green-50 border-green-200 text-green-600 border-dashed'>
            {t('trading.requirements.list.sufficient')}
          </Badge>
        )}
      </TableCell>
      <TableCell className='w-[140px] min-w-[140px] py-4 text-left invisible md:visible'>
        {requirement.packaging ? (
          <div className='flex flex-col'>
            <div className='flex items-center gap-1.5'>
              <span className='text-[12px] font-black text-green-600'>
                {requirement.packaging.packQty} {requirement.packaging.packUnit}
              </span>
              <ArrowRightLeft className='size-2 text-muted-foreground/40' />
            </div>
            <span className='text-[9px] text-muted-foreground/50 font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]'>
              {requirement.packaging.direction === 'reverse'
                ? t('trading.requirements.export.packagingFormulaReverse', {
                    unit: requirement.unit,
                    factor: requirement.packaging.factor,
                    packUnit: requirement.packaging.packUnit,
                  })
                : t('trading.requirements.export.packagingFormulaForward', {
                    unit: requirement.unit,
                    factor: requirement.packaging.factor,
                    packUnit: requirement.packaging.packUnit,
                  })}
            </span>
          </div>
        ) : (
          <span className='text-[10px] text-muted-foreground/30'>-</span>
        )}
      </TableCell>
      <TableCell className='w-[120px] min-w-[120px] text-right pr-6 py-4'>
        <div className='flex flex-col items-end gap-1'>
          <div className='flex items-center gap-1.5'>
            <span className={cn('text-[9px] font-black uppercase tracking-tighter', isShortage ? 'text-amber-600' : 'text-green-600')}>
              {isShortage ? t('trading.requirements.list.pendingPrep') : t('trading.requirements.list.ready')}
            </span>
            <div className={cn('size-1.5 rounded-full', isShortage ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse' : 'bg-green-500')} />
          </div>
          <div className='flex flex-wrap gap-1 justify-end'>
            <span className='text-[8px] font-bold text-muted-foreground/40 whitespace-nowrap'>
              {t('trading.requirements.list.sourceOrders', { count: requirement.sourceOrders.length })}
            </span>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
