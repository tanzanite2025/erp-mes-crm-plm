'use client'

import { AlertCircle, FileText, Package2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Card, CardContent } from '@/components/ui/card'

interface RequirementStatsProps {
  stats: {
    totalMaterials: number
    missingBOMCount: number
    activeOrderCount: number
  }
}

export function RequirementStats({ stats }: RequirementStatsProps) {
  const { t } = useLanguage()

  const items = [
    {
      label: t('mrp.requirements.stats.pendingOrders'),
      value: stats.activeOrderCount,
      sub: t('mrp.requirements.stats.pendingOrdersSub'),
      icon: FileText,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: t('mrp.requirements.stats.materials'),
      value: stats.totalMaterials,
      sub: t('mrp.requirements.stats.materialsSub'),
      icon: Package2,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: t('mrp.requirements.stats.missingBom'),
      value: stats.missingBOMCount,
      sub: t('mrp.requirements.stats.missingBomSub'),
      icon: AlertCircle,
      color: stats.missingBOMCount > 0 ? 'text-amber-500' : 'text-emerald-500',
      bg: stats.missingBOMCount > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
    },
  ]

  return (
    <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-3'>
      {items.map((item, index) => (
        <Card
          key={index}
          className='group overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-muted/5 shadow-inner backdrop-blur-sm transition-all duration-500 hover:bg-white hover:shadow-xl'
        >
          <CardContent className='flex items-center gap-4 p-5'>
            <div
              className={`size-12 rounded-2xl ${item.bg} flex items-center justify-center transition-transform group-hover:scale-110`}
            >
              <item.icon className={`size-6 ${item.color}`} />
            </div>
            <div className='flex flex-col'>
              <span className='text-[10px] font-black tracking-[0.2em] text-muted-foreground/40 uppercase italic'>
                {item.label}
              </span>
              <div className='flex items-baseline gap-2'>
                <span className='text-3xl font-black tracking-tighter italic tabular-nums'>
                  {item.value.toLocaleString()}
                </span>
                <span className='text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                  {item.sub}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
