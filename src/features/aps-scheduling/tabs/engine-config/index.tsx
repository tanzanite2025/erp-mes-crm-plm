'use client'

import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getApsSchedulingTabs } from '../../tab-config'
import { DateRuleCard } from './components/date-rule-card'
import { EngineOverviewCard } from './components/engine-overview-card'
import { ENGINE_SECTION_TITLE_CLASS } from './ui-classes'
import { greedyDateRuleSummaryItems } from './data/engine-config-shell'

export function ApsEngineConfigTab() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout title={t('apsScheduling.layout.title')} tabs={getApsSchedulingTabs(t)}>
      <div className='flex flex-col gap-5 animate-in fade-in duration-500'>
        <EngineOverviewCard />

        <section className='space-y-3'>
          <h2 className={ENGINE_SECTION_TITLE_CLASS}>{t('apsScheduling.engineConfig.sections.factorDeckTitle')}</h2>
          <DateRuleCard summaryItems={greedyDateRuleSummaryItems} />
        </section>
      </div>
    </ModuleTabbedLayout>
  )
}
