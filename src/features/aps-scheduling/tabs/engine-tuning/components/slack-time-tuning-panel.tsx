import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import {
  ENGINE_CARD_SHELL_CLASS,
  ENGINE_CARD_TITLE_CLASS,
} from '../../engine-config/ui-classes'

export function SlackTimeTuningPanel() {
  const { t } = useLanguage()
  const [enabled, setEnabled] = useState(true)
  const [thresholdDays, setThresholdDays] = useState(3)
  const [scalePenalty, setScalePenalty] = useState(100)
  const [overduePenalty, setOverduePenalty] = useState(1000)

  return (
    <Card className={`${ENGINE_CARD_SHELL_CLASS} bg-muted/5`}>
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-cyan-500/5 via-transparent' />
      <CardHeader className='relative flex flex-row items-center gap-2 p-2.5 pb-1'>
        <CalendarClock className='size-4 shrink-0 text-cyan-600' />
        <div className='flex flex-col min-w-0'>
          <CardTitle className={`${ENGINE_CARD_TITLE_CLASS} leading-none`}>
            {t('apsScheduling.engineConfig.slackTimeCard.title')} - 参数微调
          </CardTitle>
          <CardDescription className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 leading-tight mt-0.5 truncate'>
            调节交期与超期惩罚权重分值。
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className='relative p-3 pt-0 space-y-2'>
        {/* Toggle Switch */}
        <div className='flex items-center justify-between rounded-xl bg-background px-2.5 py-1.5 border border-dashed border-muted/50'>
          <span className='text-[10px] font-black uppercase tracking-wider text-muted-foreground/70'>
            启用交期与松弛时间惩罚
          </span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              enabled ? 'bg-cyan-500' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-sm ring-0 transition duration-200 ease-in-out ${
                enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Threshold Days Input */}
        <div className='grid gap-1'>
          <label className='text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 leading-none'>
            交期预警触发天数 (天)
          </label>
          <div className='relative flex items-center'>
            <input
              type='number'
              value={thresholdDays}
              disabled={!enabled}
              onChange={(e) => setThresholdDays(Number(e.target.value))}
              className='h-8 w-full rounded-lg border-none bg-background px-3 text-[11px] font-black text-foreground shadow-sm focus:ring-1 focus:ring-cyan-500 focus:outline-hidden disabled:opacity-40'
              min='0'
            />
            <span className='absolute right-4 text-[10px] font-black text-muted-foreground'>天</span>
          </div>
        </div>

        {/* Scale Penalty Input */}
        <div className='grid gap-1'>
          <label className='text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 leading-none'>
            临期警告扣分系数 (分/天)
          </label>
          <div className='relative flex items-center'>
            <input
              type='number'
              value={scalePenalty}
              disabled={!enabled}
              onChange={(e) => setScalePenalty(Number(e.target.value))}
              className='h-8 w-full rounded-lg border-none bg-background px-3 text-[11px] font-black text-foreground shadow-sm focus:ring-1 focus:ring-cyan-500 focus:outline-hidden disabled:opacity-40'
              min='0'
            />
            <span className='absolute right-4 text-[10px] font-black text-muted-foreground'>分/天</span>
          </div>
        </div>

        {/* Overdue Penalty Input */}
        <div className='grid gap-1'>
          <label className='text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 leading-none'>
            订单超期固定扣分 (分)
          </label>
          <div className='relative flex items-center'>
            <input
              type='number'
              value={overduePenalty}
              disabled={!enabled}
              onChange={(e) => setOverduePenalty(Number(e.target.value))}
              className='h-8 w-full rounded-lg border-none bg-background px-3 text-[11px] font-black text-foreground shadow-sm focus:ring-1 focus:ring-cyan-500 focus:outline-hidden disabled:opacity-40'
              min='0'
            />
            <span className='absolute right-4 text-[10px] font-black text-muted-foreground'>分</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
