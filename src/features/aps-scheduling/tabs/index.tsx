'use client'

import { useState } from 'react'
import { useLanguage } from '@/context/language-provider'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { ApsHeaderCard } from '../components/aps-header-card'
import { ApsKpiCards } from '../components/aps-kpi-cards'
import { ApsTimelineBoard } from '../components/aps-timeline-board'
import { ApsToolbar } from '../components/aps-toolbar'
import { useApsSchedulingSource } from '../hooks/use-aps-scheduling-source'
import { useFilteredApsSchedulingSource } from '../hooks/use-filtered-aps-scheduling-source'
import { getApsSchedulingTabs } from '../tab-config'

export function ApsSchedulingBoard() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const { source, isFallback } = useApsSchedulingSource()
  const filteredSource = useFilteredApsSchedulingSource(source, searchTerm)

  const isSearchEmpty =
    searchTerm.trim().length > 0 && filteredSource.jobs.length === 0

  return (
    <ModuleTabbedLayout tabs={getApsSchedulingTabs(t)}>
      <div className='flex animate-in flex-col gap-6 duration-700 fade-in'>
        <ApsHeaderCard source={filteredSource} isFallback={isFallback} />
        <ApsKpiCards source={filteredSource} />
        <ApsToolbar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          source={filteredSource}
        />

        {isSearchEmpty ? (
          <Card className='rounded-[24px] border border-dashed border-muted/50 bg-background shadow-none'>
            <CardContent className='flex flex-col items-center justify-center gap-3 py-12 text-center'>
              <p className='text-base font-black tracking-tighter text-slate-800 italic'>
                {t('apsScheduling.board.noResultsTitle')}
              </p>
              <p className='max-w-lg text-[10px] font-black tracking-widest text-muted-foreground/45 uppercase'>
                {t('apsScheduling.board.noResultsSubtitle')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <ApsTimelineBoard source={filteredSource} />
        )}
      </div>
    </ModuleTabbedLayout>
  )
}
