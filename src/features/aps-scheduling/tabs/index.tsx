'use client'

import { useState } from 'react'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { Card, CardContent } from '@/components/ui/card'
import { getApsSchedulingTabs } from '../tab-config'
import { ApsHeaderCard } from '../components/aps-header-card'
import { ApsKpiCards } from '../components/aps-kpi-cards'
import { ApsTimelineBoard } from '../components/aps-timeline-board'
import { ApsToolbar } from '../components/aps-toolbar'
import { useApsSchedulingSource } from '../hooks/use-aps-scheduling-source'
import { useFilteredApsSchedulingSource } from '../hooks/use-filtered-aps-scheduling-source'

export function ApsSchedulingBoard() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const { source } = useApsSchedulingSource()
  const filteredSource = useFilteredApsSchedulingSource(source, searchTerm)

  const isSearchEmpty = searchTerm.trim().length > 0 && filteredSource.jobs.length === 0

  return (
    <ModuleTabbedLayout title={t('apsScheduling.layout.title')} tabs={getApsSchedulingTabs(t as any)}>
      <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
        <ApsHeaderCard source={filteredSource} />
        <ApsKpiCards source={filteredSource} />
        <ApsToolbar searchTerm={searchTerm} onSearchTermChange={setSearchTerm} source={filteredSource} />

        {isSearchEmpty ? (
          <Card className='rounded-[24px] border border-dashed border-muted/50 bg-background shadow-none'>
            <CardContent className='flex flex-col items-center justify-center gap-3 py-16 text-center'>
              <p className='text-base font-black italic tracking-tighter text-slate-800'>{t('apsScheduling.board.noResultsTitle')}</p>
              <p className='max-w-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground/45'>
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
