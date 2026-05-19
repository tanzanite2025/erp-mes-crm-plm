import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getApsSchedulingTabs } from '../../tab-config'
import {
  ENGINE_SECTION_DECOR_CLASS,
  ENGINE_SECTION_HEADER_CLASS,
  ENGINE_SECTION_SHELL_CLASS,
  ENGINE_SECTION_TITLE_CLASS,
} from '../engine-config/ui-classes'
import { CalendarTuningPanel } from './components/calendar-tuning-panel'
import { SlackTimeTuningPanel } from './components/slack-time-tuning-panel'
import { AttendanceTuningPanel } from './components/attendance-tuning-panel'

export function ApsEngineTuningTab() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getApsSchedulingTabs(t)}>
      <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
        {/* Top Header Card / Overview style */}
        <div className='relative overflow-hidden rounded-[32px] border border-dashed border-cyan-500/15 bg-muted/5 p-8'>
          <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-cyan-500/10 via-transparent' />
          <div className='relative flex flex-col gap-2'>
            <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
              Tuning Dashboard
            </div>
            <h1 className='text-xl font-black tracking-tighter italic uppercase text-foreground'>
              排产寻优权重参数微调
            </h1>
            <p className='text-xs leading-5 text-muted-foreground max-w-2xl'>
              在此调整贪婪寻优求解器（Greedy Solver）在计算候选窗口评分时的权重、惩罚系数和出勤联锁。所有的变动均模块化为独立插件因子，支持直接应用于评分打分器。
            </p>
          </div>
        </div>

        {/* Panel Section */}
        <section className={ENGINE_SECTION_SHELL_CLASS}>
          <div className={ENGINE_SECTION_HEADER_CLASS}>
            <h2 className={ENGINE_SECTION_TITLE_CLASS}>策略规则参数调节面板</h2>
            <div className={ENGINE_SECTION_DECOR_CLASS}>
              <span className='size-1.5 rounded-full bg-primary/45' />
              <span className='h-px w-14 border-t border-dashed border-muted/45' />
            </div>
          </div>
          <div className='mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            <CalendarTuningPanel />
            <SlackTimeTuningPanel />
            <AttendanceTuningPanel />
          </div>
        </section>
      </div>
    </ModuleTabbedLayout>
  )
}
