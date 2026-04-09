'use client'

import { AlertTriangle, Settings2, ShieldAlert, ThermometerSnowflake } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import { useMoldStatus } from '../../hooks/use-mold-status'

interface MoldRequirementAlertProps {
  models: { modelName: string; totalQty: number }[]
}

export function MoldRequirementAlert({ models }: MoldRequirementAlertProps) {
  const { t } = useLanguage()
  const { alerts, isLoading } = useMoldStatus(models)

  if (isLoading) {
    return (
      <div className='mb-6 p-4 rounded-2xl bg-white/50 border border-dashed animate-pulse flex items-center gap-3'>
        <div className='size-8 rounded-full bg-muted' />
        <div className='space-y-2 flex-1'>
          <div className='h-3 w-1/3 bg-muted rounded' />
          <div className='h-2 w-1/2 bg-muted rounded' />
        </div>
      </div>
    )
  }

  if (alerts.length === 0) return null

  return (
    <div className='mb-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500'>
      <div className='flex items-center gap-2 px-1'>
        <ShieldAlert className='size-4 text-amber-500' />
        <h3 className='text-xs font-black uppercase tracking-wider text-amber-600'>
          {t('trading.requirements.mold.title')}
        </h3>
      </div>

      <div className='grid gap-3'>
        {alerts.map((alert) => (
          <Card key={alert.modelName} className='overflow-hidden border-amber-100 bg-gradient-to-br from-amber-50/50 to-white shadow-sm'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4'>
              <div className='flex items-start gap-3'>
                <div className='p-2.5 rounded-xl bg-amber-100 text-amber-600 mt-1'>
                  <AlertTriangle className='size-5' />
                </div>
                <div className='space-y-1'>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-black text-slate-800'>{alert.modelName}</span>
                    <Badge variant='outline' className='text-[10px] font-bold border-amber-200 text-amber-700 bg-amber-50'>
                      {t('trading.requirements.mold.orderDemand', { count: alert.totalQty })}
                    </Badge>
                  </div>
                  <p className='text-[11px] font-medium text-slate-500'>
                    {t('trading.requirements.mold.totalRemaining', { count: alert.totalRemaining })}
                    {alert.shortage > 0 && (
                      <span className='text-red-500 ml-1 font-black underline'>
                        ({t('trading.requirements.mold.shortage', { count: alert.shortage })})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className='flex flex-wrap gap-2'>
                {alert.criticalMolds.map((mold, index) => (
                  <div key={index} className='inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-amber-100 shadow-sm'>
                    <Settings2 className='size-3 text-slate-400' />
                    <span className='text-[10px] font-bold text-slate-600'>{mold.sn}</span>
                    <div className='h-3 w-px bg-slate-100' />
                    <div className='flex items-center gap-1'>
                      <div className='w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden'>
                        <div className={`h-full rounded-full ${mold.health < 10 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${mold.health}%` }} />
                      </div>
                      <span className={`text-[9px] font-black ${mold.health < 10 ? 'text-red-500' : 'text-amber-600'}`}>
                        {mold.health}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!alert.isSufficient && (
              <div className='px-4 py-2 bg-red-50 border-t border-red-100 flex items-center gap-2'>
                <ThermometerSnowflake className='size-3 text-red-500' />
                <span className='text-[10px] font-bold text-red-600'>
                  {t('trading.requirements.mold.insufficient')}
                </span>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
