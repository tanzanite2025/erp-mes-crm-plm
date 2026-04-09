'use client'

import { type MaterialRequirement } from '../../data/requirement-schema'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import { Box, Factory, HelpCircle, Lock, Truck } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SupplyAnalysisDetailsProps {
  item: MaterialRequirement
  className?: string
}

export function SupplyAnalysisDetails({ item, className }: SupplyAnalysisDetailsProps) {
  const { t } = useLanguage()

  const buckets = [
    {
      key: 'inventory',
      label: t('trading.requirements.list.buckets.inventory'),
      value: item.inventoryQty,
      icon: Box,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      key: 'locked',
      label: t('trading.requirements.list.buckets.locked'),
      value: item.lockedQty,
      icon: Lock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      isMinus: true,
    },
    {
      key: 'purchase',
      label: t('trading.requirements.list.buckets.purchase'),
      value: item.onWayPurchaseQty,
      icon: Truck,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      key: 'wip',
      label: t('trading.requirements.list.buckets.wip'),
      value: item.wipQty,
      icon: Factory,
      color: 'text-muted-foreground/40',
      bgColor: 'bg-muted/10',
      isPending: true,
    },
  ]

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className='flex items-center gap-1 flex-wrap'>
        {buckets.map((bucket) => (
          <TooltipProvider key={bucket.key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-black tracking-tighter truncate max-w-[110px]',
                    bucket.bgColor,
                    bucket.isPending ? 'border-dashed border-muted-foreground/20' : 'border-transparent'
                  )}
                >
                  <bucket.icon className={cn('size-2.5', bucket.color)} />
                  <span className={bucket.color}>
                    {bucket.isMinus ? '-' : ''}
                    {bucket.value}
                  </span>
                  {bucket.isPending && (
                    <span className='text-[8px] opacity-40 font-normal italic ml-0.5'>
                      [{t('trading.requirements.list.pendingIntegration')}]
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side='top' className='text-[10px] font-black uppercase'>
                {bucket.label}: {bucket.value} {item.unit}
                {bucket.isPending ? ` (${t('trading.requirements.list.pendingIntegrationHint')})` : ''}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      <div className='flex items-center gap-2'>
        <div className='h-px flex-1 bg-gradient-to-r from-muted via-muted/50 to-transparent' />
        <div className='text-[9px] font-black uppercase italic text-muted-foreground/60 flex items-center gap-1.5'>
          <span>{t('trading.requirements.list.totalSupplyLabel')}:</span>
          <span className='text-primary text-[11px] non-italic'>
            {item.totalSupply} {item.unit}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className='size-2.5 cursor-help opacity-40 hover:opacity-100 transition-opacity' />
              </TooltipTrigger>
              <TooltipContent className='max-w-[220px] text-[10px] font-bold p-3 leading-relaxed'>
                <div>{t('trading.requirements.list.formulaTitle')}</div>
                <div>
                  {t('trading.requirements.list.formulaLineUsable', {
                    inventory: item.inventoryQty,
                    locked: item.lockedQty,
                  })}
                </div>
                <div>
                  {t('trading.requirements.list.formulaLinePurchase', {
                    purchase: item.onWayPurchaseQty,
                  })}
                </div>
                <div>
                  {t('trading.requirements.list.formulaLineWip', {
                    wip: item.wipQty,
                  })}
                </div>
                <div>
                  {t('trading.requirements.list.formulaLineTotal', {
                    total: item.totalSupply,
                    unit: item.unit,
                  })}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}
