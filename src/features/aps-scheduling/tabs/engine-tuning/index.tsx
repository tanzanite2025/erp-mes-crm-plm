import { SlidersHorizontal } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { getApsSchedulingTabs } from '../../tab-config'
import {
  ENGINE_BADGE_CLASS,
  ENGINE_SECTION_DECOR_CLASS,
  ENGINE_SECTION_HEADER_CLASS,
  ENGINE_SECTION_SHELL_CLASS,
  ENGINE_SECTION_TITLE_CLASS,
} from '../engine-config/ui-classes'
import { AttendanceTuningPanel } from './components/attendance-tuning-panel'
import { CalendarTuningPanel } from './components/calendar-tuning-panel'
import { SlackTimeTuningPanel } from './components/slack-time-tuning-panel'

export function ApsEngineTuningTab() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getApsSchedulingTabs(t)}>
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <IndustrialHeader
          icon={SlidersHorizontal}
          title='排产寻优权重参数微调'
          description='在此调整贪婪寻优求解器（Greedy Solver）在计算候选窗口评分时的权重、惩罚系数和出勤联锁。所有的变动均模块化为独立插件因子，支持直接应用于评分打分器。'
          gradient
          statusBadge={
            <div
              className={`${ENGINE_BADGE_CLASS} border-cyan-500/20 bg-cyan-500/5 text-cyan-700`}
            >
              Tuning Dashboard
            </div>
          }
        />

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
