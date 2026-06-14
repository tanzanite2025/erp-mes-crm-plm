'use client'

import {
  AlertTriangle,
  Settings2,
  ShieldAlert,
  ThermometerSnowflake,
} from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useMoldStatus } from '../../hooks/use-mold-status'

interface MoldRequirementAlertProps {
  models: { modelName: string; totalQty: number }[]
}

export function MoldRequirementAlert({ models }: MoldRequirementAlertProps) {
  const { t } = useLanguage()
  const { alerts, isLoading } = useMoldStatus(models)

  if (isLoading) {
    return (
      <div className='mb-6 flex animate-pulse items-center gap-3 rounded-2xl border border-dashed bg-white/50 p-4'>
        <div className='size-8 rounded-full bg-muted' />
        <div className='flex-1 space-y-2'>
          <div className='h-3 w-1/3 rounded bg-muted' />
          <div className='h-2 w-1/2 rounded bg-muted' />
        </div>
      </div>
    )
  }

  if (alerts.length === 0) return null

  return (
    <div className='mb-6 animate-in space-y-3 duration-500 fade-in slide-in-from-top-4'>
      <div className='flex items-center gap-2 px-1'>
        <ShieldAlert className='size-4 text-amber-500' />
        <h3 className='text-xs font-black tracking-wider text-amber-600 uppercase'>
          {t('mrp.requirements.mold.title')}
        </h3>
      </div>

      <div className='grid gap-3'>
        {alerts.map((alert) => (
          <Card
            key={alert.modelName}
            className='overflow-hidden border-amber-100 bg-gradient-to-br from-amber-50/50 to-white shadow-sm'
          >
            <div className='flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center'>
              <div className='flex items-start gap-3'>
                <div className='mt-1 rounded-xl bg-amber-100 p-2.5 text-amber-600'>
                  <AlertTriangle className='size-5' />
                </div>
                <div className='space-y-1'>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-black text-slate-800'>
                      {alert.modelName}
                    </span>
                    <Badge
                      variant='outline'
                      className='border-amber-200 bg-amber-50 text-[10px] font-bold text-amber-700'
                    >
                      {t('mrp.requirements.mold.orderDemand', {
                        count: alert.totalQty,
                      })}
                    </Badge>
                  </div>
                  <p className='text-[11px] font-medium text-slate-500'>
                    {t('mrp.requirements.mold.totalRemaining', {
                      count: alert.totalRemaining,
                    })}
                    {alert.shortage > 0 && (
                      <span className='ml-1 font-black text-red-500 underline'>
                        (
                        {t('mrp.requirements.mold.shortage', {
                          count: alert.shortage,
                        })}
                        )
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className='flex flex-wrap gap-2'>
                {alert.criticalMolds.map((mold, index) => (
                  <div
                    key={index}
                    className='inline-flex items-center gap-2 rounded-lg border border-amber-100 bg-white px-3 py-1.5 shadow-sm'
                  >
                    <Settings2 className='size-3 text-slate-400' />
                    <span className='text-[10px] font-bold text-slate-600'>
                      {mold.sn}
                    </span>
                    <div className='h-3 w-px bg-slate-100' />
                    <div className='flex items-center gap-1'>
                      <div className='h-1.5 w-12 overflow-hidden rounded-full bg-slate-100'>
                        <div
                          className={`h-full rounded-full ${mold.health < 10 ? 'bg-red-500' : 'bg-amber-500'}`}
                          style={{ width: `${mold.health}%` }}
                        />
                      </div>
                      <span
                        className={`text-[9px] font-black ${mold.health < 10 ? 'text-red-500' : 'text-amber-600'}`}
                      >
                        {mold.health}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!alert.isSufficient && (
              <div className='flex items-center gap-2 border-t border-red-100 bg-red-50 px-4 py-2'>
                <ThermometerSnowflake className='size-3 text-red-500' />
                <span className='text-[10px] font-bold text-red-600'>
                  {t('mrp.requirements.mold.insufficient')}
                </span>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
