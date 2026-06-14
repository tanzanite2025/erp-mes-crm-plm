import { Suspense, lazy, useMemo, useState } from 'react'
import { Check, LayoutDashboard, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { SegmentedTabs } from '@/components/segmented-tabs'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import type { ProductionSegment as Segment } from '@/features/production-shared/data/production-line'
import { useProductionLinesQuery } from '@/features/production-shared/hooks/use-production-resources'
import { useHierarchyLevelLabels } from '@/features/production-shared/tabs/hierarchy-config/hooks/use-hierarchy-level-labels'
import { KpiGrid } from './components/kpi-grid'
import { TraceActivityList } from './components/trace-activity-list'
import { useVisibleDashboardSegments } from './hooks/use-visible-dashboard-segments'

const Overview = lazy(() =>
  import('./components/overview').then((m) => ({ default: m.Overview }))
)
const SystemEvents = lazy(() =>
  import('./components/system-events').then((m) => ({
    default: m.SystemEvents,
  }))
)
const ProductionCalendar = lazy(() => import('@/features/production-calendar'))
const OrdersProgress = lazy(() =>
  import('./components/orders-progress').then((m) => ({
    default: m.OrdersProgress,
  }))
)

export function Dashboard() {
  const { t } = useLanguage()
  const { level1Name } = useHierarchyLevelLabels()
  const [activeTab, setActiveTab] = useState('overview')
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [draftVisibleSegmentIds, setDraftVisibleSegmentIds] = useState<
    string[] | null
  >(null)
  const { data: lines } = useProductionLinesQuery()
  const segments = useMemo<(Segment & { lineName: string })[]>(() => {
    return (lines ?? []).flatMap((line) =>
      (line.segments || []).map((seg) => ({
        ...seg,
        lineName: line.name,
      }))
    )
  }, [lines])
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
    .filter((s) => savedVisibleSegmentIds.includes(s.id))
    .map((s) => ({
      name: s.name,
      total: 0,
    }))

  return (
    <>
      <Header fixed />

      <div
        className={cn(
          'fixed top-14 right-0 z-40 flex h-14 items-center border-b border-dashed bg-background/95 px-4 py-2.5 shadow-sm backdrop-blur md:top-16 md:h-16',
          'transition-all duration-300 ease-in-out',
          'left-0 md:left-40 group-data-[state=collapsed]/sidebar-wrapper:md:left-12'
        )}
      >
        <div className='flex w-full items-center justify-between gap-4'>
          <SegmentedTabs
            tabs={[
              { value: 'overview', label: t('dashboard.page.tabs.overview') },
              { value: 'calendar', label: t('dashboard.page.tabs.calendar') },
              { value: 'reports', label: t('dashboard.page.tabs.reports') },
              {
                value: 'notifications',
                label: t('dashboard.page.tabs.notifications'),
              },
            ]}
            value={activeTab}
            onValueChange={setActiveTab}
            className='flex-1'
          />
        </div>
      </div>

      <Main className='animate-in pt-14 duration-700 fade-in md:pt-16'>
        <div className='flex flex-col gap-6 md:gap-8'>
          <IndustrialHeader
            title={t('dashboard.page.title')}
            description={t('dashboard.page.description')}
            icon={LayoutDashboard}
          />

          <Tabs value={activeTab} className='space-y-4'>
            <Suspense
              fallback={
                <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                  <Skeleton className='h-32' />
                  <Skeleton className='h-32' />
                  <Skeleton className='h-32' />
                  <Skeleton className='h-32' />
                </div>
              }
            >
              <TabsContent value='overview' className='flex flex-col gap-8'>
                <KpiGrid />
                <div className='grid grid-cols-1 gap-4'>
                  <Card className='col-span-1 overflow-hidden rounded-2xl border-2 border-dashed border-muted/60 bg-muted/5 shadow-none md:rounded-[32px]'>
                    <CardHeader className='flex flex-row items-center justify-between border-b border-dashed border-muted/80 px-4 py-4 md:px-6'>
                      <div className='space-y-1'>
                        <CardTitle className='text-lg font-black tracking-tighter text-slate-800 uppercase italic md:text-xl'>
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
                        className='size-9 rounded-xl border border-transparent text-muted-foreground transition-all hover:border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-600'
                        onClick={handleOpenConfig}
                      >
                        <Settings className='size-5' />
                      </Button>
                    </CardHeader>
                    <CardContent className='bg-background/30 p-4 md:p-6'>
                      <Overview data={chartData} levelName={level1Name} />
                    </CardContent>
                  </Card>

                  <Card className='col-span-1 overflow-hidden rounded-2xl border-2 border-dashed border-muted/60 bg-muted/5 shadow-none md:rounded-[32px]'>
                    <CardHeader className='border-b border-dashed border-muted/80 px-4 py-4 md:px-6'>
                      <CardTitle className='text-lg font-black tracking-tighter text-slate-800 uppercase italic md:text-xl'>
                        {t('dashboard.page.scanStream.title')}
                      </CardTitle>
                      <CardDescription className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                        {t('dashboard.page.scanStream.description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='bg-background/30 p-4 md:p-6'>
                      <TraceActivityList />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value='calendar'>
                <ProductionCalendar />
              </TabsContent>
              <TabsContent value='reports'>
                <OrdersProgress />
              </TabsContent>
              <TabsContent value='notifications'>
                <SystemEvents />
              </TabsContent>
            </Suspense>
          </Tabs>
        </div>
      </Main>

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

            <div className='grid grid-cols-2 gap-3 py-2'>
              {segments.map((seg) => (
                <div
                  key={seg.id}
                  className={`group flex cursor-pointer items-center space-x-3 rounded-2xl border-2 border-dashed p-3 transition-all ${
                    selectedSegmentIds.includes(seg.id)
                      ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/10'
                      : 'border-muted/40 bg-muted/5 hover:border-muted/80'
                  }`}
                  onClick={() => {
                    const newIds = selectedSegmentIds.includes(seg.id)
                      ? selectedSegmentIds.filter((id) => id !== seg.id)
                      : [...selectedSegmentIds, seg.id]
                    setDraftVisibleSegmentIds(newIds)
                  }}
                >
                  <div
                    className={`flex size-5 items-center justify-center rounded-lg border-2 transition-all ${
                      selectedSegmentIds.includes(seg.id)
                        ? 'scale-105 border-primary bg-primary text-white shadow-lg shadow-primary/20'
                        : 'border-muted-foreground/20 bg-background group-hover:border-muted-foreground/40'
                    }`}
                  >
                    {selectedSegmentIds.includes(seg.id) && (
                      <Check className='size-3 stroke-4' />
                    )}
                  </div>
                  <div className='flex flex-col overflow-hidden'>
                    <span className='truncate text-[11px] font-black tracking-tight text-slate-700 uppercase'>
                      {seg.name}
                    </span>
                    <span className='mt-0.5 truncate font-mono text-[8px] leading-none tracking-widest text-muted-foreground/50 uppercase'>
                      {seg.lineName}
                    </span>
                  </div>
                </div>
              ))}
              {segments.length === 0 && (
                <div className='col-span-2 rounded-[32px] border-2 border-dashed border-muted bg-muted/5 py-10 text-center'>
                  <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                    {t('dashboard.page.segmentDialog.emptyTitle', {
                      levelName: level1Name,
                    })}
                  </p>
                  <p className='mt-1 text-[9px] font-black tracking-tighter text-muted-foreground/40 uppercase'>
                    {t('dashboard.page.segmentDialog.emptyDescription', {
                      levelName: level1Name,
                    })}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className='gap-3 sm:justify-end'>
              <Button
                variant='ghost'
                onClick={() => handleConfigOpenChange(false)}
                className='h-11 rounded-full border-none bg-muted/30 px-8 text-[10px] font-black tracking-widest uppercase hover:bg-muted/50'
              >
                {t('dashboard.page.segmentDialog.cancel')}
              </Button>
              <Button
                onClick={() => void handleSaveConfig()}
                className='h-11 rounded-full bg-primary px-8 text-[10px] font-black tracking-widest text-white uppercase shadow-lg shadow-primary/20 hover:bg-primary/90'
              >
                {t('dashboard.page.segmentDialog.save')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
