import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import {
  ENGINE_CARD_SHELL_CLASS,
  ENGINE_CARD_TITLE_CLASS,
  ENGINE_DESC_CLASS,
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
      <CardHeader className='relative gap-4 pb-4'>
        <div className='flex items-start gap-3 text-amber-600'>
          <div className='flex size-12 shrink-0 items-center justify-center rounded-[22px] border border-dashed border-amber-500/20 bg-background shadow-md'>
            <Calendar className='size-5' />
          </div>
          <div>
            <CardTitle className={ENGINE_CARD_TITLE_CLASS}>
              {t('apsScheduling.engineConfig.dateRuleCard.title')} - 参数微调
            </CardTitle>
            <CardDescription className={ENGINE_DESC_CLASS}>
              调节日历排程因子比重，微调工作日、加班以及节假日的得分。
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className='relative space-y-4'>
        {/* Toggle Switches */}
        <div className='flex items-center justify-between rounded-xl bg-background px-4 py-3.5 border border-dashed border-muted/50'>
          <span className='text-[10px] font-black uppercase tracking-wider text-muted-foreground/70'>
            法定节假日停排计划
          </span>
          <button
            onClick={() => setHolidayStop(!holidayStop)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              holidayStop ? 'bg-amber-500' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-sm ring-0 transition duration-200 ease-in-out ${
                holidayStop ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className='flex items-center justify-between rounded-xl bg-background px-4 py-3.5 border border-dashed border-muted/50'>
          <span className='text-[10px] font-black uppercase tracking-wider text-muted-foreground/70'>
            优先选择标准工作日
          </span>
          <button
            onClick={() => setPreferWorkday(!preferWorkday)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              preferWorkday ? 'bg-amber-500' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-sm ring-0 transition duration-200 ease-in-out ${
                preferWorkday ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Inputs */}
        <div className='grid gap-2.5'>
          <label className='text-[10px] font-black uppercase tracking-wider text-muted-foreground/60'>
            工作日优选奖励分 (分)
          </label>
          <input
            type='number'
            value={workdayBonus}
            onChange={(e) => setWorkdayBonus(Number(e.target.value))}
            className='h-12 w-full rounded-2xl border-none bg-background px-4 text-xs font-black text-foreground shadow-sm focus:ring-1 focus:ring-amber-500 focus:outline-hidden'
            min='0'
          />
        </div>

        <div className='grid gap-2.5'>
          <label className='text-[10px] font-black uppercase tracking-wider text-muted-foreground/60'>
            加班时间奖励分 (分)
          </label>
          <input
            type='number'
            value={overtimeBonus}
            onChange={(e) => setOvertimeBonus(Number(e.target.value))}
            className='h-12 w-full rounded-2xl border-none bg-background px-4 text-xs font-black text-foreground shadow-sm focus:ring-1 focus:ring-amber-500 focus:outline-hidden'
            min='0'
          />
        </div>

        <div className='grid gap-2.5'>
          <label className='text-[10px] font-black uppercase tracking-wider text-muted-foreground/60'>
            节假日扣减惩罚分 (分)
          </label>
          <input
            type='number'
            value={holidayPenalty}
            onChange={(e) => setHolidayPenalty(Number(e.target.value))}
            className='h-12 w-full rounded-2xl border-none bg-background px-4 text-xs font-black text-foreground shadow-sm focus:ring-1 focus:ring-amber-500 focus:outline-hidden'
            min='0'
          />
        </div>
      </CardContent>
    </Card>
  )
}
