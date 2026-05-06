import { useMemo, useState } from 'react'
import { Settings, Check, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KpiGrid } from '@/features/dashboard/components/kpi-grid'
import { Overview } from '@/features/dashboard/components/overview'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/context/language-provider'
import { type ProductionSegment as Segment } from '@/features/production-shared/data/production-line'
import { useProductionLinesQuery } from '@/features/production-shared/hooks/use-production-resources'
import { useHierarchyLevelLabels } from '@/features/production-shared/tabs/hierarchy-config/hooks/use-hierarchy-level-labels'
import { useVisibleDashboardSegments } from '@/features/dashboard/hooks/use-visible-dashboard-segments'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Failed to load production lines'
}

export function DashboardOverviewTab() {
  const { t } = useLanguage()
  const { level1Name } = useHierarchyLevelLabels()
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [draftVisibleSegmentIds, setDraftVisibleSegmentIds] = useState<string[] | null>(null)
  const { data: lines = [], isLoading: loading, error, refetch } = useProductionLinesQuery()

  const segments = useMemo<(Segment & { lineName: string })[]>(
    () =>
      lines.flatMap((line) =>
        (line.segments || []).map((segment) => ({
          ...segment,
          lineName: line.name,
        })),
      ),
    [lines],
  )
  const segmentIds = useMemo(() => segments.map((segment) => segment.id), [segments])

  const { visibleSegmentIds: savedVisibleSegmentIds, saveVisibleSegmentIds } =
    useVisibleDashboardSegments(segmentIds)
  const selectedSegmentIds = draftVisibleSegmentIds ?? savedVisibleSegmentIds

  const handleConfigOpenChange = (open: boolean) => {
    setIsConfigOpen(open)
    if (!open) {
      setDraftVisibleSegmentIds(null)
    }
  }

  const handleOpenConfig = () => {
    setDraftVisibleSegmentIds([...savedVisibleSegmentIds])
    setIsConfigOpen(true)
  }

  const handleSaveConfig = async () => {
    await saveVisibleSegmentIds(selectedSegmentIds)
    setDraftVisibleSegmentIds(null)
    setIsConfigOpen(false)
  }

  const chartData = segments
    .filter((segment) => savedVisibleSegmentIds.includes(segment.id))
    .map((segment) => ({
      name: segment.name,
      total: 0,
    }))

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center h-64 gap-3 animate-in fade-in duration-500'>
        <Loader2 className='size-8 animate-spin text-primary opacity-60' />
        <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
          {t('common.actions.loading')}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center h-96 gap-4 p-8 bg-destructive/5 rounded-[32px] border border-dashed border-destructive/20 animate-in zoom-in-95 duration-500'>
        <AlertCircle className='size-12 text-destructive opacity-40' />
        <div className='text-center space-y-1'>
          <h3 className='text-sm font-black uppercase tracking-tighter text-destructive italic'>
            [CRITICAL] Backend Connectivity Failure
          </h3>
          <p className='text-[10px] font-bold text-destructive/60 uppercase tracking-widest'>
            {getErrorMessage(error)}
          </p>
        </div>
        <Button
          variant='outline'
          onClick={() => void refetch()}
          className='rounded-full h-9 px-8 text-[10px] font-black uppercase tracking-widest border-destructive/20 text-destructive hover:bg-destructive/10'
        >
          {t('common.actions.retry')}
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className='flex flex-col gap-8'>
        <KpiGrid />
        <div className='grid grid-cols-1 gap-4'>
          <Card className='col-span-1 rounded-2xl md:rounded-[32px] border-dashed border-2 border-muted/60 bg-muted/5 shadow-none overflow-hidden'>
            <CardHeader className='flex flex-row items-center justify-between px-4 py-4 md:px-6 border-b border-dashed border-muted/80'>
              <div className='space-y-1'>
                <CardTitle className='text-lg md:text-xl font-black uppercase tracking-tighter text-slate-800 italic'>
                  {t('dashboard.page.throughput.title')}
                </CardTitle>
                <CardDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                  {t('dashboard.page.throughput.description', { levelName: level1Name })}
                </CardDescription>
              </div>
              <Button
                variant='ghost'
                size='icon'
                className='size-9 rounded-xl text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 transition-all border border-transparent hover:border-blue-500/20'
                onClick={handleOpenConfig}
              >
                <Settings className='size-5' />
              </Button>
            </CardHeader>
            <CardContent className='p-4 md:p-6 bg-background/30'>
              <Overview data={chartData} levelName={level1Name} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isConfigOpen} onOpenChange={handleConfigOpenChange}>
        <DialogContent className='sm:max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden bg-background'>
          <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />

          <div className='relative p-8 space-y-6'>
            <DialogHeader className='text-left space-y-1.5'>
              <DialogTitle className='text-lg font-black tracking-tighter italic uppercase text-slate-800'>
                {t('dashboard.page.segmentDialog.title', { levelName: level1Name })}
              </DialogTitle>
              <DialogDescription className='text-[9px] font-black uppercase tracking-widest opacity-60'>
                {t('dashboard.page.segmentDialog.description', { levelName: level1Name })}
              </DialogDescription>
            </DialogHeader>

            <div className='max-h-[40vh] overflow-y-auto px-1'>
              <div className='grid grid-cols-2 gap-3 py-2'>
                {segments.map((segment) => (
                  <div
                    key={segment.id}
                    className={`flex items-center space-x-3 p-3 border-dashed border-2 rounded-2xl transition-all cursor-pointer group ${
                      selectedSegmentIds.includes(segment.id)
                        ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/10'
                        : 'bg-muted/5 border-muted/40 hover:border-muted/80'
                    }`}
                    onClick={() => {
                      const newIds = selectedSegmentIds.includes(segment.id)
                        ? selectedSegmentIds.filter((id) => id !== segment.id)
                        : [...selectedSegmentIds, segment.id]
                      setDraftVisibleSegmentIds(newIds)
                    }}
                  >
                    <div
                      className={`size-5 rounded-lg flex items-center justify-center border-2 transition-all ${
                        selectedSegmentIds.includes(segment.id)
                          ? 'bg-primary border-primary'
                          : 'bg-transparent border-muted-foreground/20 group-hover:border-muted-foreground/40'
                      }`}
                    >
                      {selectedSegmentIds.includes(segment.id) && <Check className='size-3 text-white' />}
                    </div>
                    <div className='flex flex-col min-w-0'>
                      <span className='text-[11px] font-black uppercase tracking-tighter truncate leading-none'>
                        {segment.name}
                      </span>
                      <span className='text-[8px] font-mono text-muted-foreground/50 uppercase tracking-widest mt-1'>
                        {segment.lineName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className='pt-4 border-t border-dashed'>
              <Button
                type='submit'
                onClick={() => void handleSaveConfig()}
                className='w-full rounded-full h-11 font-black text-[10px] uppercase tracking-widest'
              >
                {t('common.actions.save')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
