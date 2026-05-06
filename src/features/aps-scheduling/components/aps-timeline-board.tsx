import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import { useHierarchyLevelLabels } from '@/features/production-shared/tabs/hierarchy-config/hooks/use-hierarchy-level-labels'
import type { ApsSchedulingSource } from '../adapters/aps-scheduling.adapter'
import { ApsTimelineLane } from './aps-timeline-lane'

type ApsTimelineBoardProps = {
  source: ApsSchedulingSource
}

export function ApsTimelineBoard({ source }: ApsTimelineBoardProps) {
  const { t } = useLanguage()
  const { level2Name, level3Name } = useHierarchyLevelLabels()

  return (
    <Card className='rounded-[24px] border border-dashed border-muted/50 bg-background shadow-none'>
      <CardContent className='flex flex-col gap-4 p-4 md:p-5'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex flex-col gap-1'>
            <p className='text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground/50'>
              {t('apsScheduling.board.boardTitle')}
            </p>
            <p className='text-[9px] font-black uppercase tracking-[0.24em] text-cyan-600/60'>
              {t('apsScheduling.board.boardSubtitle')}
            </p>
          </div>
          <div className='flex items-center gap-2 rounded-full border border-dashed border-cyan-500/15 bg-cyan-500/5 px-3 py-1'>
            <span className='text-[9px] font-black uppercase tracking-[0.24em] text-cyan-700/60'>
              {t('apsScheduling.board.live')}
            </span>
          </div>
        </div>

        <div className='overflow-hidden rounded-[22px] border border-dashed border-muted/50 bg-muted/5'>
          <div className='grid grid-cols-[180px_repeat(6,minmax(120px,1fr))] border-b border-dashed border-muted/50 bg-background/80'>
            <div className='px-4 py-2 text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground/35'>
              {t('apsScheduling.board.laneLabel')}
            </div>
            {source.timelineSlots.map((slot, index) => (
              <div
                key={slot}
                className='flex items-center justify-between border-l border-dashed border-muted/40 px-4 py-2 text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground/40'
              >
                <span>{slot}</span>
                <span className='text-cyan-500/50'>0{index + 1}</span>
              </div>
            ))}
          </div>

          <div className='divide-y divide-dashed divide-muted/50'>
            {source.lanes.map((lane) => (
              <ApsTimelineLane key={lane.line} line={lane.line} jobs={lane.jobs} />
            ))}
          </div>

          <div className='border-t border-dashed border-muted/50 bg-background/40'>
            {source.processTree.map((line) => (
              <div key={line.id} className='grid grid-cols-[180px_1fr]'>
                <div className='border-r border-dashed border-muted/40 bg-background/70 px-4 py-3'>
                  <p className='text-sm font-black tracking-tight text-foreground'>{line.name}</p>
                  <p className='mt-1 text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground/45'>
                    {line.code}
                  </p>
                  {line.description ? (
                    <p className='mt-1.5 text-[10px] leading-4 text-muted-foreground/70'>
                      {line.description}
                    </p>
                  ) : null}
                </div>
                <div className='flex flex-col gap-2 px-4 py-3'>
                  {line.segments.map((segment) => (
                    <div
                      key={segment.id}
                      className='rounded-[18px] border border-dashed border-cyan-500/15 bg-cyan-500/5 p-2.5'
                    >
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <div>
                          <p className='text-xs font-black uppercase tracking-[0.24em] text-cyan-700/80'>
                            {segment.name}
                          </p>
                          {segment.description ? (
                            <p className='mt-0.5 text-[10px] text-cyan-900/60'>{segment.description}</p>
                          ) : null}
                        </div>
                        <span className='rounded-full border border-cyan-500/15 bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-700/70'>
                          {t('apsScheduling.board.segmentCategoryCount', {
                            count: segment.jobCategories.length,
                            levelName: level2Name,
                          })}
                        </span>
                      </div>

                      <div className='mt-2 flex flex-col gap-2'>
                        {segment.jobCategories.map((jobCategory) => (
                          <div
                            key={jobCategory.id}
                            className='rounded-[14px] border border-dashed border-muted/40 bg-background/80 p-2.5'
                          >
                            <div className='flex items-center justify-between gap-2'>
                              <div>
                                <p className='text-[10px] font-black uppercase tracking-[0.22em] text-foreground'>
                                  {jobCategory.name}
                                </p>
                                {jobCategory.description ? (
                                  <p className='mt-0.5 text-[10px] text-muted-foreground/70'>
                                    {jobCategory.description}
                                  </p>
                                ) : null}
                              </div>
                              <span className='rounded-full border border-muted/30 px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60'>
                                {t('apsScheduling.board.processCount', {
                                  count: jobCategory.processes.length,
                                  levelName: level3Name,
                                })}
                              </span>
                            </div>

                            <div className='mt-2 flex flex-wrap gap-2'>
                              {jobCategory.processes.map((process) => (
                                <div
                                  key={process.id}
                                  className='rounded-full border border-dashed border-muted/30 bg-muted/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/80'
                                >
                                  {process.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
