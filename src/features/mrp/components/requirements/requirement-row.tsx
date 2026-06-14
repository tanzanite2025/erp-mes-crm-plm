'use client'

import { AlertTriangle, ArrowRightLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import { type MaterialRequirement } from '../../data/requirement-schema'
import { SupplyAnalysisDetails } from './supply-analysis-details'

interface RequirementRowProps {
  requirement: MaterialRequirement
}

export function RequirementRow({ requirement }: RequirementRowProps) {
  const { t } = useLanguage()
  const isShortage = requirement.effectiveGap > 0

  return (
    <TableRow className='group animate-in border-b text-left transition-colors duration-500 fade-in last:border-0 hover:bg-muted/5'>
      <TableCell className='w-[100px] min-w-[100px] truncate py-4 pl-6 font-mono text-[10px] font-bold text-muted-foreground/70'>
        {requirement.materialCode}
      </TableCell>
      <TableCell className='w-auto py-4 text-left'>
        <div className='flex max-w-[240px] flex-col gap-0.5 truncate'>
          <span className='truncate text-[12px] leading-tight font-black'>
            {requirement.materialName}
          </span>
          <span className='truncate text-[10px] font-medium text-muted-foreground/50'>
            {requirement.materialSpec}
          </span>
        </div>
      </TableCell>
      <TableCell className='w-[90px] min-w-[90px] py-4 text-right'>
        <span className='text-[12px] font-bold text-slate-800 tabular-nums'>
          {requirement.totalRequired.toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
          <span className='ml-0.5 text-[9px] font-medium text-muted-foreground/50'>
            {requirement.unit}
          </span>
        </span>
      </TableCell>
      <TableCell className='w-[90px] min-w-[90px] py-4 text-right'>
        <div className='flex flex-col items-end'>
          <span className='text-[12px] font-bold text-slate-800 tabular-nums'>
            {requirement.usableStock.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            <span className='ml-0.5 text-[9px] font-medium text-muted-foreground/50'>
              {requirement.unit}
            </span>
          </span>
          <span className='text-[8px] font-bold text-muted-foreground/40'>
            {t('mrp.requirements.list.usableStockHint', {
              inventory: requirement.inventoryQty,
              locked: requirement.lockedQty,
            })}
          </span>
        </div>
      </TableCell>
      <TableCell className='w-[200px] min-w-[200px] bg-muted/5 px-4 py-4'>
        <SupplyAnalysisDetails item={requirement} />
      </TableCell>
      <TableCell className='w-[110px] min-w-[110px] bg-slate-50/10 py-4 text-right'>
        {isShortage ? (
          <div className='flex flex-col items-end'>
            <span className='text-[14px] font-black tracking-tighter text-rose-600 tabular-nums'>
              -
              {requirement.effectiveGap.toLocaleString(undefined, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              <span className='ml-0.5 text-[10px] font-bold'>
                {requirement.unit}
              </span>
            </span>
            {requirement.packaging && (
              <div className='mt-0.5 rounded border border-amber-100/50 bg-amber-50 px-1 text-[9px] font-bold text-amber-600/80 shadow-sm'>
                {t('mrp.requirements.list.packagingAtLeast', {
                  count: requirement.packaging.packQty,
                  unit: requirement.packaging.packUnit,
                })}
              </div>
            )}
            <div className='mt-1 flex items-center gap-0.5 text-[8px] font-black text-rose-400 uppercase'>
              <AlertTriangle className='size-2' />
              {t('mrp.requirements.list.needPurchase')}
            </div>
          </div>
        ) : (
          <Badge
            variant='outline'
            className='rounded border-dashed border-green-200 bg-green-50 px-1.5 py-0 text-[10px] font-black text-green-600'
          >
            {t('mrp.requirements.list.sufficient')}
          </Badge>
        )}
      </TableCell>
      <TableCell className='invisible w-[140px] min-w-[140px] py-4 text-left md:visible'>
        {requirement.packaging ? (
          <div className='flex flex-col'>
            <div className='flex items-center gap-1.5'>
              <span className='text-[12px] font-black text-green-600'>
                {requirement.packaging.packQty} {requirement.packaging.packUnit}
              </span>
              <ArrowRightLeft className='size-2 text-muted-foreground/40' />
            </div>
            <span className='max-w-[120px] overflow-hidden text-[9px] font-bold text-ellipsis whitespace-nowrap text-muted-foreground/50'>
              {requirement.packaging.direction === 'reverse'
                ? t('mrp.requirements.export.packagingFormulaReverse', {
                    unit: requirement.unit,
                    factor: requirement.packaging.factor,
                    packUnit: requirement.packaging.packUnit,
                  })
                : t('mrp.requirements.export.packagingFormulaForward', {
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
      <TableCell className='w-[120px] min-w-[120px] py-4 pr-6 text-right'>
        <div className='flex flex-col items-end gap-1'>
          <div className='flex items-center gap-1.5'>
            <span
              className={cn(
                'text-[9px] font-black tracking-tighter uppercase',
                isShortage ? 'text-amber-600' : 'text-green-600'
              )}
            >
              {isShortage
                ? t('mrp.requirements.list.pendingPrep')
                : t('mrp.requirements.list.ready')}
            </span>
            <div
              className={cn(
                'size-1.5 rounded-full',
                isShortage
                  ? 'animate-pulse bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                  : 'bg-green-500'
              )}
            />
          </div>
          <div className='flex flex-wrap justify-end gap-1'>
            <span className='text-[8px] font-bold whitespace-nowrap text-muted-foreground/40'>
              {t('mrp.requirements.list.sourceOrders', {
                count: requirement.sourceOrders.length,
              })}
            </span>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
