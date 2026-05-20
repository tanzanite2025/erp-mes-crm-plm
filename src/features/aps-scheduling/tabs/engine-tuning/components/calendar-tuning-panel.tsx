import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import {
  ENGINE_CARD_SHELL_CLASS,
  ENGINE_CARD_TITLE_CLASS,
} from '../../engine-config/ui-classes'

export function CalendarTuningPanel() {
  const { t } = useLanguage()
  const [holidayStop, setHolidayStop] = useState(true)
  const [preferWorkday, setPreferWorkday] = useState(true)
  const [workdayBonus, setWorkdayBonus] = useState(15)
  const [overtimeBonus, setOvertimeBonus] = useState(5)
  const [holidayPenalty, setHolidayPenalty] = useState(120)

  return (
    <Card className={`${ENGINE_CARD_SHELL_CLASS} bg-muted/5`}>
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-amber-500/5 via-transparent' />
      <CardHeader className='relative flex flex-row items-center gap-2 p-2.5 pb-1'>
        <Calendar className='size-4 shrink-0 text-amber-600' />
        <div className='flex flex-col min-w-0'>
          <CardTitle className={`${ENGINE_CARD_TITLE_CLASS} leading-none`}>
            {t('apsScheduling.engineConfig.dateRuleCard.title')} - 参数微调
          </CardTitle>
          <CardDescription className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 leading-tight mt-0.5 truncate'>
            调节日历寻优计算权重分值。
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className='relative p-3 pt-0 space-y-2'>
        {/* Toggle Switches */}
        <div className='flex items-center justify-between rounded-xl bg-background px-2.5 py-1.5 border border-dashed border-muted/50'>
          <span className='text-[10px] font-black uppercase tracking-wider text-muted-foreground/70'>
            法定节假日停排计划
          </span>
          <button
            onClick={() => setHolidayStop(!holidayStop)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              holidayStop ? 'bg-amber-500' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-sm ring-0 transition duration-200 ease-in-out ${
                holidayStop ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className='flex items-center justify-between rounded-xl bg-background px-2.5 py-1.5 border border-dashed border-muted/50'>
          <span className='text-[10px] font-black uppercase tracking-wider text-muted-foreground/70'>
            优先选择标准工作日
          </span>
          <button
            onClick={() => setPreferWorkday(!preferWorkday)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              preferWorkday ? 'bg-amber-500' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-sm ring-0 transition duration-200 ease-in-out ${
                preferWorkday ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Inputs */}
        <div className='grid gap-1'>
          <label className='text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 leading-none'>
            工作日优选奖励分 (分)
          </label>
          <input
            type='number'
            value={workdayBonus}
            onChange={(e) => setWorkdayBonus(Number(e.target.value))}
            className='h-8 w-full rounded-lg border-none bg-background px-3 text-[11px] font-black text-foreground shadow-sm focus:ring-1 focus:ring-amber-500 focus:outline-hidden'
            min='0'
          />
        </div>

        <div className='grid gap-1'>
          <label className='text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 leading-none'>
            加班时间奖励分 (分)
          </label>
          <input
            type='number'
            value={overtimeBonus}
            onChange={(e) => setOvertimeBonus(Number(e.target.value))}
            className='h-8 w-full rounded-lg border-none bg-background px-3 text-[11px] font-black text-foreground shadow-sm focus:ring-1 focus:ring-amber-500 focus:outline-hidden'
            min='0'
          />
        </div>

        <div className='grid gap-1'>
          <label className='text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 leading-none'>
            节假日扣减惩罚分 (分)
          </label>
          <input
            type='number'
            value={holidayPenalty}
            onChange={(e) => setHolidayPenalty(Number(e.target.value))}
            className='h-8 w-full rounded-lg border-none bg-background px-3 text-[11px] font-black text-foreground shadow-sm focus:ring-1 focus:ring-amber-500 focus:outline-hidden'
            min='0'
          />
        </div>
      </CardContent>
    </Card>
  )
}
