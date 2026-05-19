import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import {
  ENGINE_CARD_SHELL_CLASS,
  ENGINE_CARD_TITLE_CLASS,
  ENGINE_DESC_CLASS,
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
      <CardHeader className='relative gap-4 pb-4'>
        <div className='flex items-start gap-3 text-cyan-600'>
          <div className='flex size-12 shrink-0 items-center justify-center rounded-[22px] border border-dashed border-cyan-500/20 bg-background shadow-md'>
            <CalendarClock className='size-5' />
          </div>
          <div>
            <CardTitle className={ENGINE_CARD_TITLE_CLASS}>
              {t('apsScheduling.engineConfig.slackTimeCard.title')} - 参数微调
            </CardTitle>
            <CardDescription className={ENGINE_DESC_CLASS}>
              调节交期迫近时的惩罚曲线参数与超期重罚权重。
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className='relative space-y-4'>
        {/* Toggle Switch */}
        <div className='flex items-center justify-between rounded-xl bg-background px-4 py-3.5 border border-dashed border-muted/50'>
          <span className='text-[10px] font-black uppercase tracking-wider text-muted-foreground/70'>
            启用交期与松弛时间惩罚
          </span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              enabled ? 'bg-cyan-500' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-sm ring-0 transition duration-200 ease-in-out ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Threshold Days Input */}
        <div className='grid gap-2.5'>
          <label className='text-[10px] font-black uppercase tracking-wider text-muted-foreground/60'>
            交期预警触发天数 (天)
          </label>
          <div className='relative flex items-center'>
            <input
              type='number'
              value={thresholdDays}
              disabled={!enabled}
              onChange={(e) => setThresholdDays(Number(e.target.value))}
              className='h-12 w-full rounded-2xl border-none bg-background px-4 text-xs font-black text-foreground shadow-sm focus:ring-1 focus:ring-cyan-500 focus:outline-hidden disabled:opacity-40'
              min='0'
            />
            <span className='absolute right-4 text-[10px] font-black text-muted-foreground'>天</span>
          </div>
        </div>

        {/* Scale Penalty Input */}
        <div className='grid gap-2.5'>
          <label className='text-[10px] font-black uppercase tracking-wider text-muted-foreground/60'>
            临期警告扣分系数 (分/天)
          </label>
          <div className='relative flex items-center'>
            <input
              type='number'
              value={scalePenalty}
              disabled={!enabled}
              onChange={(e) => setScalePenalty(Number(e.target.value))}
              className='h-12 w-full rounded-2xl border-none bg-background px-4 text-xs font-black text-foreground shadow-sm focus:ring-1 focus:ring-cyan-500 focus:outline-hidden disabled:opacity-40'
              min='0'
            />
            <span className='absolute right-4 text-[10px] font-black text-muted-foreground'>分/天</span>
          </div>
        </div>

        {/* Overdue Penalty Input */}
        <div className='grid gap-2.5'>
          <label className='text-[10px] font-black uppercase tracking-wider text-muted-foreground/60'>
            订单超期固定扣分 (分)
          </label>
          <div className='relative flex items-center'>
            <input
              type='number'
              value={overduePenalty}
              disabled={!enabled}
              onChange={(e) => setOverduePenalty(Number(e.target.value))}
              className='h-12 w-full rounded-2xl border-none bg-background px-4 text-xs font-black text-foreground shadow-sm focus:ring-1 focus:ring-cyan-500 focus:outline-hidden disabled:opacity-40'
              min='0'
            />
            <span className='absolute right-4 text-[10px] font-black text-muted-foreground'>分</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
