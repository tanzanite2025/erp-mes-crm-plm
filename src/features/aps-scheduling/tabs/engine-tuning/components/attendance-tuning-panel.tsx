import { useState } from 'react'
import { UserCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import {
  ENGINE_CARD_SHELL_CLASS,
  ENGINE_CARD_TITLE_CLASS,
} from '../../engine-config/ui-classes'

export function AttendanceTuningPanel() {
  const { t } = useLanguage()
  const [enabled, setEnabled] = useState(true)
  const [minRate, setMinRate] = useState(50)
  const [derate, setDerate] = useState(80)
  const [source, setSource] = useState('simulated')

  return (
    <Card className={`${ENGINE_CARD_SHELL_CLASS} bg-muted/5`}>
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent' />
      <CardHeader className='relative flex flex-row items-center gap-2 p-2.5 pb-1'>
        <UserCheck className='size-4 shrink-0 text-emerald-600' />
        <div className='flex flex-col min-w-0'>
          <CardTitle className={`${ENGINE_CARD_TITLE_CLASS} leading-none`}>
            {t('apsScheduling.engineConfig.attendanceCard.title')} - 参数微调
          </CardTitle>
          <CardDescription className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 leading-tight mt-0.5 truncate'>
            调节出勤阈值与折减系数。
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className='relative p-3 pt-0 space-y-2'>
        {/* Toggle Switch */}
        <div className='flex items-center justify-between rounded-xl bg-background px-2.5 py-1.5 border border-dashed border-muted/50'>
          <span className='text-[10px] font-black uppercase tracking-wider text-muted-foreground/70'>
            启用考勤打卡联锁
          </span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              enabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-sm ring-0 transition duration-200 ease-in-out ${
                enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Min Attendance Rate Input */}
        <div className='grid gap-1'>
          <label className='text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 leading-none'>
            最低出勤率阈值 (%)
          </label>
          <div className='relative flex items-center'>
            <input
              type='number'
              value={minRate}
              disabled={!enabled}
              onChange={(e) => setMinRate(Number(e.target.value))}
              className='h-8 w-full rounded-lg border-none bg-background px-3 text-[11px] font-black text-foreground shadow-sm focus:ring-1 focus:ring-emerald-500 focus:outline-hidden disabled:opacity-40'
              min='0'
              max='100'
            />
            <span className='absolute right-4 text-[10px] font-black text-muted-foreground'>%</span>
          </div>
        </div>

        {/* Capacity Derating Factor Input */}
        <div className='grid gap-1'>
          <label className='text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 leading-none'>
            缺勤产能折算系数 (%)
          </label>
          <div className='relative flex items-center'>
            <input
              type='number'
              value={derate}
              disabled={!enabled}
              onChange={(e) => setDerate(Number(e.target.value))}
              className='h-8 w-full rounded-lg border-none bg-background px-3 text-[11px] font-black text-foreground shadow-sm focus:ring-1 focus:ring-emerald-500 focus:outline-hidden disabled:opacity-40'
              min='0'
              max='100'
            />
            <span className='absolute right-4 text-[10px] font-black text-muted-foreground'>%</span>
          </div>
        </div>

        {/* Attendance Source Association */}
        <div className='grid gap-1'>
          <label className='text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 leading-none'>
            打卡考勤源集成配置
          </label>
          <select
            value={source}
            disabled={!enabled}
            onChange={(e) => setSource(e.target.value)}
            className='h-8 w-full rounded-lg border-none bg-background px-3 text-[11px] font-black text-foreground shadow-sm focus:ring-1 focus:ring-emerald-500 focus:outline-hidden disabled:opacity-40'
          >
            <option value='simulated'>模拟考勤数据源</option>
            <option value='fingerprint'>车间生物指纹打卡机 API</option>
            <option value='rfid'>RFID 闸机进出事件流 (MQTT)</option>
            <option value='dingtalk'>钉钉考勤审批流同步</option>
          </select>
        </div>
      </CardContent>
    </Card>
  )
}
