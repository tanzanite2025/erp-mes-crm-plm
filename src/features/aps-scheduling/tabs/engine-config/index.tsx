import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getApsSchedulingTabs } from '../../tab-config'
import { ApsBoundaryTable } from './components/aps-boundary-table'
import { AttendanceCard } from './components/attendance-card'
import { DateRuleCard } from './components/date-rule-card'
import { EngineOverviewCard } from './components/engine-overview-card'
import { FactorCardGrid } from './components/factor-card-grid'
import { SlackTimeCard } from './components/slack-time-card'
import { buildDateRuleFactorViewModel, buildSystemDefaultGreedyDateRuleSnapshot } from './data/date-rule-factor'
import { buildSlackTimeFactorViewModel, buildSystemDefaultGreedySlackTimeSnapshot } from './data/slack-time-factor'
import { buildAttendanceFactorViewModel, buildSystemDefaultGreedyAttendanceSnapshot } from './data/attendance-factor'
import {
  ENGINE_SECTION_DECOR_CLASS,
  ENGINE_SECTION_HEADER_CLASS,
  ENGINE_SECTION_SHELL_CLASS,
  ENGINE_SECTION_TITLE_CLASS,
} from './ui-classes'

export function ApsEngineConfigTab() {
  const { t } = useLanguage()
  const snapshot = buildSystemDefaultGreedyDateRuleSnapshot()
  const dateRuleFactor = buildDateRuleFactorViewModel(snapshot, t)

  const slackSnapshot = buildSystemDefaultGreedySlackTimeSnapshot()
  const slackTimeFactor = buildSlackTimeFactorViewModel(slackSnapshot, t)

  const attendanceSnapshot = buildSystemDefaultGreedyAttendanceSnapshot()
  const attendanceFactor = buildAttendanceFactorViewModel(attendanceSnapshot, t)

  return (
    <ModuleTabbedLayout tabs={getApsSchedulingTabs(t)}>
      <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
        <EngineOverviewCard />

        <section className={ENGINE_SECTION_SHELL_CLASS}>
          <div className={ENGINE_SECTION_HEADER_CLASS}>
            <h2 className={ENGINE_SECTION_TITLE_CLASS}>{t('apsScheduling.engineConfig.sections.factorDeckTitle')}</h2>
            <div className={ENGINE_SECTION_DECOR_CLASS}>
              <span className='size-1.5 rounded-full bg-primary/45' />
              <span className='h-px w-14 border-t border-dashed border-muted/45' />
            </div>
          </div>
          <div className='mt-5'>
            <FactorCardGrid>
              <DateRuleCard
                badges={dateRuleFactor.sourceBadges}
                summaryItems={dateRuleFactor.summaryItems}
              />
              <SlackTimeCard
                badges={slackTimeFactor.sourceBadges}
                summaryItems={slackTimeFactor.summaryItems}
              />
              <AttendanceCard
                badges={attendanceFactor.sourceBadges}
                summaryItems={attendanceFactor.summaryItems}
              />
            </FactorCardGrid>
          </div>
        </section>

        <section className={`${ENGINE_SECTION_SHELL_CLASS} bg-background/70`}>
          <div className={ENGINE_SECTION_HEADER_CLASS}>
            <h2 className={ENGINE_SECTION_TITLE_CLASS}>{t('apsScheduling.engineConfig.sections.boundaryTableTitle')}</h2>
            <div className={ENGINE_SECTION_DECOR_CLASS}>
              <span className='size-1.5 rounded-full bg-primary/35' />
              <span className='h-px w-18 border-t border-dashed border-muted/45' />
            </div>
          </div>
          <div className='mt-5'>
            <ApsBoundaryTable />
          </div>
        </section>
      </div>
    </ModuleTabbedLayout>
  )
}
