import { useMemo, useState } from 'react'
import {
  Settings,
  Check,
  AlertCircle,
  Loader2,
  Heart,
  ShieldCheck,
} from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { KpiGrid } from '@/features/dashboard/components/kpi-grid'
import { Overview } from '@/features/dashboard/components/overview'
import { useTraceStats } from '@/features/dashboard/hooks/use-trace-stats'
import { useVisibleDashboardSegments } from '@/features/dashboard/hooks/use-visible-dashboard-segments'
import { type ProductionSegment as Segment } from '@/features/production-shared/data/production-line'
import { useProductionLinesQuery } from '@/features/production-shared/hooks/use-production-resources'
import { useHierarchyLevelLabels } from '@/features/production-shared/tabs/hierarchy-config/hooks/use-hierarchy-level-labels'

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
  const [draftVisibleSegmentIds, setDraftVisibleSegmentIds] = useState<
    string[] | null
  >(null)
  const {
    data: lines = [],
    isLoading: loading,
    error,
    refetch,
  } = useProductionLinesQuery()
  const { stats } = useTraceStats()

  const wipVal = stats?.wip ?? 0
  const scrapVal = stats?.scrap ?? 0
  const totalVal = wipVal + scrapVal
  const okPercent = totalVal > 0 ? Math.round((wipVal / totalVal) * 100) : 100

  const passRateData = [
    { name: '合格品 (WIP)', value: wipVal || 1, color: '#10b981' },
    { name: '报废品 (SCRAP)', value: scrapVal, color: '#ef4444' },
  ]
  const segments = useMemo<(Segment & { lineName: string })[]>(
    () =>
      lines.flatMap((line) =>
        (line.segments || []).map((segment) => ({
          ...segment,
          lineName: line.name,
        }))
      ),
    [lines]
  )
  const segmentIds = useMemo(
    () => segments.map((segment) => segment.id),
    [segments]
  )

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
      <div className='flex h-64 animate-in flex-col items-center justify-center gap-3 duration-500 fade-in'>
        <Loader2 className='size-8 animate-spin text-primary opacity-60' />
        <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
          {t('common.actions.loading')}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex h-96 animate-in flex-col items-center justify-center gap-4 rounded-[32px] border border-dashed border-destructive/20 bg-destructive/5 p-8 duration-500 zoom-in-95'>
        <AlertCircle className='size-12 text-destructive opacity-40' />
        <div className='space-y-1 text-center'>
          <h3 className='text-sm font-black tracking-tighter text-destructive uppercase italic'>
            [CRITICAL] Backend Connectivity Failure
          </h3>
          <p className='text-[10px] font-bold tracking-widest text-destructive/60 uppercase'>
            {getErrorMessage(error)}
          </p>
        </div>
        <Button
          variant='outline'
          onClick={() => void refetch()}
          className='h-9 rounded-full border-destructive/20 px-8 text-[10px] font-black tracking-widest text-destructive uppercase hover:bg-destructive/10'
        >
          {t('common.actions.retry')}
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className='flex flex-col gap-4'>
        <KpiGrid />

        <div className='grid grid-cols-1 gap-3.5 lg:grid-cols-12'>
          {/* Left Column: Throughput Chart (col-span-8) */}
          <Card className='relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-dashed bg-muted/5 p-4 shadow-none lg:col-span-8'>
            <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
            <CardHeader className='z-10 flex flex-row items-center justify-between border-b border-dashed border-muted/30 p-0 pb-3'>
              <div className='space-y-1'>
                <CardTitle className='flex items-center gap-1.5 text-sm font-black tracking-tight uppercase italic'>
                  <Heart className='size-4 text-primary' />
                  {t('dashboard.page.throughput.title')}
                </CardTitle>
                <CardDescription className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                  {t('dashboard.page.throughput.description', {
                    levelName: level1Name,
                  })}
                </CardDescription>
              </div>
              <Button
                variant='ghost'
                size='icon'
                className='size-7 rounded-lg border border-transparent text-muted-foreground transition-all hover:border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-600'
                onClick={handleOpenConfig}
              >
                <Settings className='size-4' />
              </Button>
            </CardHeader>
            <CardContent className='z-10 flex-1 bg-background/30 p-0 pt-4'>
              <Overview data={chartData} levelName={level1Name} />
            </CardContent>
          </Card>

          {/* Right Column: OK Rate Indicator (col-span-4) */}
          <Card className='relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-dashed bg-muted/5 p-4 shadow-none lg:col-span-4'>
            <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />

            <div>
              <CardHeader className='z-10 border-b border-dashed border-muted/30 p-0 pb-3'>
                <CardTitle className='flex items-center gap-1.5 text-sm font-black tracking-tight text-emerald-500 uppercase italic'>
                  <ShieldCheck className='size-4' />
                  全厂直通率与合格分析
                </CardTitle>
                <CardDescription className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                  QUALITY_PASS_RATE_SCAN / 实时在制量与报废比率
                </CardDescription>
              </CardHeader>

              <CardContent className='z-10 flex min-h-[180px] flex-col items-center justify-center p-0 pt-6'>
                <div className='relative flex h-[130px] w-[130px] items-center justify-center'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={passRateData}
                        cx='50%'
                        cy='50%'
                        innerRadius={45}
                        outerRadius={58}
                        paddingAngle={3}
                        dataKey='value'
                      >
                        {passRateData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className='absolute flex flex-col items-center justify-center'>
                    <span className='text-2xl font-black tracking-tighter text-emerald-600 italic'>
                      {okPercent}%
                    </span>
                    <span className='text-[8px] leading-none font-black tracking-widest text-muted-foreground/60 uppercase'>
                      直通率
                    </span>
                  </div>
                </div>

                <div className='mt-4 grid w-full grid-cols-2 gap-4 border-t border-dashed border-muted/30 pt-4 text-xs font-black'>
                  <div className='flex flex-col items-center gap-1 rounded-xl border border-dashed border-muted/20 bg-background/50 p-2'>
                    <span className='text-[8px] tracking-widest text-muted-foreground/50 uppercase'>
                      合格品数 (WIP)
                    </span>
                    <span className='font-mono text-sm font-black text-emerald-600 italic'>
                      {stats?.wip || 0} PCS
                    </span>
                  </div>
                  <div className='flex flex-col items-center gap-1 rounded-xl border border-dashed border-muted/20 bg-background/50 p-2'>
                    <span className='text-[8px] tracking-widest text-muted-foreground/50 uppercase'>
                      报废品数 (SCRAP)
                    </span>
                    <span className='font-mono text-sm font-black text-rose-500 italic'>
                      {stats?.scrap || 0} PCS
                    </span>
                  </div>
                </div>
              </CardContent>
            </div>

            <div className='z-10 mt-4 flex items-center justify-between border-t border-dashed border-muted/30 pt-3 text-[9px] font-black text-muted-foreground/50'>
              <span>车间质检直通率</span>
              <span className='cursor-pointer text-emerald-500 hover:underline'>
                质检监控看板 &rarr;
              </span>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={isConfigOpen} onOpenChange={handleConfigOpenChange}>
        <DialogContent className='overflow-hidden rounded-[32px] border-none bg-background p-0 shadow-2xl sm:max-w-md'>
          <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />

          <div className='relative space-y-6 p-8'>
            <DialogHeader className='space-y-1.5 text-left'>
              <DialogTitle className='text-lg font-black tracking-tighter text-slate-800 uppercase italic'>
                {t('dashboard.page.segmentDialog.title', {
                  levelName: level1Name,
                })}
              </DialogTitle>
              <DialogDescription className='text-[9px] font-black tracking-widest uppercase opacity-60'>
                {t('dashboard.page.segmentDialog.description', {
                  levelName: level1Name,
                })}
              </DialogDescription>
            </DialogHeader>

            <div className='max-h-[40vh] overflow-y-auto px-1'>
              <div className='grid grid-cols-2 gap-3 py-2'>
                {segments.map((segment) => (
                  <div
                    key={segment.id}
                    className={`group flex cursor-pointer items-center space-x-3 rounded-2xl border-2 border-dashed p-3 transition-all ${
                      selectedSegmentIds.includes(segment.id)
                        ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/10'
                        : 'border-muted/40 bg-muted/5 hover:border-muted/80'
                    }`}
                    onClick={() => {
                      const newIds = selectedSegmentIds.includes(segment.id)
                        ? selectedSegmentIds.filter((id) => id !== segment.id)
                        : [...selectedSegmentIds, segment.id]
                      setDraftVisibleSegmentIds(newIds)
                    }}
                  >
                    <div
                      className={`flex size-5 items-center justify-center rounded-lg border-2 transition-all ${
                        selectedSegmentIds.includes(segment.id)
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/20 bg-transparent group-hover:border-muted-foreground/40'
                      }`}
                    >
                      {selectedSegmentIds.includes(segment.id) && (
                        <Check className='size-3 text-white' />
                      )}
                    </div>
                    <div className='flex min-w-0 flex-col'>
                      <span className='truncate text-[11px] leading-none font-black tracking-tighter uppercase'>
                        {segment.name}
                      </span>
                      <span className='mt-1 font-mono text-[8px] tracking-widest text-muted-foreground/50 uppercase'>
                        {segment.lineName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className='border-t border-dashed pt-4'>
              <Button
                type='submit'
                onClick={() => void handleSaveConfig()}
                className='h-11 w-full rounded-full text-[10px] font-black tracking-widest uppercase'
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
