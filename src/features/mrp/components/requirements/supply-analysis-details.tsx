'use client'

import { Box, Factory, HelpCircle, Lock, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { type MaterialRequirement } from '../../data/requirement-schema'

interface SupplyAnalysisDetailsProps {
  item: MaterialRequirement
  className?: string
}

export function SupplyAnalysisDetails({
  item,
  className,
}: SupplyAnalysisDetailsProps) {
  const { t } = useLanguage()

  const buckets = [
    {
      key: 'inventory',
      label: t('mrp.requirements.list.buckets.inventory'),
      value: item.inventoryQty,
      icon: Box,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      key: 'locked',
      label: t('mrp.requirements.list.buckets.locked'),
      value: item.lockedQty,
      icon: Lock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      isMinus: true,
    },
    {
      key: 'purchase',
      label: t('mrp.requirements.list.buckets.purchase'),
      value: item.onWayPurchaseQty,
      icon: Truck,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      key: 'wip',
      label: t('mrp.requirements.list.buckets.wip'),
      value: item.wipQty,
      icon: Factory,
      color: 'text-muted-foreground/40',
      bgColor: 'bg-muted/10',
      isPending: true,
    },
  ]

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className='flex flex-wrap items-center gap-1'>
        {buckets.map((bucket) => (
          <TooltipProvider key={bucket.key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'flex max-w-[110px] items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-[10px] font-black tracking-tighter',
                    bucket.bgColor,
                    bucket.isPending
                      ? 'border-dashed border-muted-foreground/20'
                      : 'border-transparent'
                  )}
                >
                  <bucket.icon className={cn('size-2.5', bucket.color)} />
                  <span className={bucket.color}>
                    {bucket.isMinus ? '-' : ''}
                    {bucket.value}
                  </span>
                  {bucket.isPending && (
                    <span className='ml-0.5 text-[8px] font-normal italic opacity-40'>
                      [{t('mrp.requirements.list.pendingIntegration')}]
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side='top'
                className='text-[10px] font-black uppercase'
              >
                {bucket.label}: {bucket.value} {item.unit}
                {bucket.isPending
                  ? ` (${t('mrp.requirements.list.pendingIntegrationHint')})`
                  : ''}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      <div className='flex items-center gap-2'>
        <div className='h-px flex-1 bg-gradient-to-r from-muted via-muted/50 to-transparent' />
        <div className='flex items-center gap-1.5 text-[9px] font-black text-muted-foreground/60 uppercase italic'>
          <span>{t('mrp.requirements.list.totalSupplyLabel')}:</span>
          <span className='non-italic text-[11px] text-primary'>
            {item.totalSupply} {item.unit}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className='size-2.5 cursor-help opacity-40 transition-opacity hover:opacity-100' />
              </TooltipTrigger>
              <TooltipContent className='max-w-[220px] p-3 text-[10px] leading-relaxed font-bold'>
                <div>{t('mrp.requirements.list.formulaTitle')}</div>
                <div>
                  {t('mrp.requirements.list.formulaLineUsable', {
                    inventory: item.inventoryQty,
                    locked: item.lockedQty,
                  })}
                </div>
                <div>
                  {t('mrp.requirements.list.formulaLinePurchase', {
                    purchase: item.onWayPurchaseQty,
                  })}
                </div>
                <div>
                  {t('mrp.requirements.list.formulaLineWip', {
                    wip: item.wipQty,
                  })}
                </div>
                <div>
                  {t('mrp.requirements.list.formulaLineTotal', {
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
