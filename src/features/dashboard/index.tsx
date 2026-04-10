import { Suspense, lazy, useEffect, useState } from 'react'
import { Check, LayoutDashboard, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { SegmentedTabs } from '@/components/segmented-tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { KpiGrid } from './components/kpi-grid'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TraceActivityList } from './components/trace-activity-list'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ProductionLine, Segment } from '../production-shared/tabs/line-mgmt/types'
import { StorageService, XDFC_STORAGE_EVENT } from '@/features/system-mgmt/services/storage-service'
import { useLanguage } from '@/context/language-provider'
import {
  PRODUCTION_LINES_UPDATED_EVENT,
  productionResourceService,
} from '@/features/production-shared/services/production-resource-service'

const Overview = lazy(() => import('./components/overview').then((m) => ({ default: m.Overview })))
const SystemEvents = lazy(() => import('./components/system-events').then((m) => ({ default: m.SystemEvents })))
const ProductionCalendar = lazy(() => import('@/features/production-calendar'))
const Analytics = lazy(() => import('./components/analytics').then((m) => ({ default: m.Analytics })))
const OrdersProgress = lazy(() => import('./components/orders-progress').then((m) => ({ default: m.OrdersProgress })))

const VISIBLE_SEGMENTS_KEY = 'xdfc_dashboard_visible_segments'

async function getStoredSegments(): Promise<(Segment & { lineName: string })[]> {
  const lines = await productionResourceService.getLines()

  return lines.flatMap((line) =>
    (line.segments || []).map((seg) => ({
      ...seg,
      lineName: line.name,
    }))
  )
}

export function Dashboard() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('overview')
  const [segments, setSegments] = useState<(Segment & { lineName: string })[]>([])
  const [visibleSegmentIds, setVisibleSegmentIds] = useState<string[]>([])
  const [isConfigOpen, setIsConfigOpen] = useState(false)

  useEffect(() => {
    let active = true

    const syncDashboardState = async () => {
      const allSegments = await getStoredSegments()
      if (!active) return

      setSegments(allSegments)

      const saved = await StorageService.getItem<string[]>(VISIBLE_SEGMENTS_KEY)
      if (!active) return

      if (saved) {
        setVisibleSegmentIds(saved)
      } else if (allSegments.length > 0) {
        const defaults = allSegments.slice(0, 5).map((s) => s.id)
        setVisibleSegmentIds(defaults)
        await StorageService.setItem(VISIBLE_SEGMENTS_KEY, defaults)
      }
    }

    void syncDashboardState()

    const handleSync = (event?: Event) => {
      const key = (event as CustomEvent<{ key?: string }> | undefined)?.detail?.key
      if (key && key !== VISIBLE_SEGMENTS_KEY) {
        return
      }
      void syncDashboardState()
    }

    window.addEventListener(XDFC_STORAGE_EVENT, handleSync)
    window.addEventListener('xdfc_storage_initialized', handleSync)
    window.addEventListener(PRODUCTION_LINES_UPDATED_EVENT, handleSync)

    return () => {
      active = false
      window.removeEventListener(XDFC_STORAGE_EVENT, handleSync)
      window.removeEventListener('xdfc_storage_initialized', handleSync)
      window.removeEventListener(PRODUCTION_LINES_UPDATED_EVENT, handleSync)
    }
  }, [])

  const handleSaveConfig = async (ids: string[]) => {
    setVisibleSegmentIds(ids)
    await StorageService.setItem(VISIBLE_SEGMENTS_KEY, ids)
    window.dispatchEvent(new CustomEvent('xdfc_dashboard_visible_segments_updated'))
    setIsConfigOpen(false)
  }

  const chartData = segments
    .filter((s) => visibleSegmentIds.includes(s.id))
    .map((s) => ({
      name: s.name,
      total: 0,
    }))

  return (
    <>
      <Header fixed />

      <div
        className={cn(
          'fixed top-14 md:top-16 right-0 z-40 border-b border-dashed bg-background/95 backdrop-blur px-4 py-2.5 h-14 md:h-16 flex items-center shadow-sm',
          'transition-all duration-300 ease-in-out',
          'left-0 md:left-[10rem] group-data-[state=collapsed]/sidebar-wrapper:md:left-[3rem]'
        )}
      >
        <div className='flex items-center justify-between gap-4 w-full'>
          <SegmentedTabs
            tabs={[
              { value: 'overview', label: t('dashboard.page.tabs.overview') },
              { value: 'calendar', label: t('dashboard.page.tabs.calendar') },
              { value: 'analytics', label: t('dashboard.page.tabs.analytics') },
              { value: 'reports', label: t('dashboard.page.tabs.reports') },
              { value: 'notifications', label: t('dashboard.page.tabs.notifications') },
            ]}
            value={activeTab}
            onValueChange={setActiveTab}
            className='flex-1'
          />
        </div>
      </div>

      <Main className='p-4 md:p-8 animate-in fade-in duration-700 pt-14 md:pt-16'>
        <div className='flex flex-col gap-6 md:gap-8'>
          <PageHeader
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
                  <Card className='col-span-1 rounded-2xl md:rounded-[32px] border-dashed border-2 border-muted/60 bg-muted/5 shadow-none overflow-hidden'>
                    <CardHeader className='flex flex-row items-center justify-between px-4 py-4 md:px-6 border-b border-dashed border-muted/80'>
                      <div className='space-y-1'>
                        <CardTitle className='text-lg md:text-xl font-black uppercase tracking-tighter text-slate-800 italic'>
                          {t('dashboard.page.throughput.title')}
                        </CardTitle>
                        <CardDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                          {t('dashboard.page.throughput.description')}
                        </CardDescription>
                      </div>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-9 rounded-xl text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 transition-all border border-transparent hover:border-blue-500/20'
                        onClick={() => setIsConfigOpen(true)}
                      >
                        <Settings className='size-5' />
                      </Button>
                    </CardHeader>
                    <CardContent className='p-4 md:p-6 bg-background/30'>
                      <Overview data={chartData} />
                    </CardContent>
                  </Card>

                  <Card className='col-span-1 rounded-2xl md:rounded-[32px] border-dashed border-2 border-muted/60 bg-muted/5 shadow-none overflow-hidden'>
                    <CardHeader className='px-4 py-4 md:px-6 border-b border-dashed border-muted/80'>
                      <CardTitle className='text-lg md:text-xl font-black uppercase tracking-tighter text-slate-800 italic'>
                        {t('dashboard.page.scanStream.title')}
                      </CardTitle>
                      <CardDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                        {t('dashboard.page.scanStream.description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='p-4 md:p-6 bg-background/30'>
                      <TraceActivityList />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value='calendar'>
                <ProductionCalendar />
              </TabsContent>
              <TabsContent value='analytics'>
                <Analytics />
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

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className='sm:max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden bg-background'>
          <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />
          
          <div className='relative p-8 space-y-6'>
            <DialogHeader className='text-left space-y-1.5'>
              <DialogTitle className='text-lg font-black tracking-tighter italic uppercase text-slate-800'>
                {t('dashboard.page.segmentDialog.title')}
              </DialogTitle>
              <DialogDescription className='text-[9px] font-black uppercase tracking-widest opacity-60'>
                {t('dashboard.page.segmentDialog.description')}
              </DialogDescription>
            </DialogHeader>

            <div className='grid grid-cols-2 gap-3 py-2'>
              {segments.map((seg) => (
                <div
                  key={seg.id}
                  className={`flex items-center space-x-3 p-3 border-dashed border-2 rounded-2xl transition-all cursor-pointer group ${
                    visibleSegmentIds.includes(seg.id) 
                      ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/10' 
                      : 'bg-muted/5 border-muted/40 hover:border-muted/80'
                  }`}
                  onClick={() => {
                    const newIds = visibleSegmentIds.includes(seg.id)
                      ? visibleSegmentIds.filter((id) => id !== seg.id)
                      : [...visibleSegmentIds, seg.id]
                    setVisibleSegmentIds(newIds)
                  }}
                >
                  <div
                    className={`flex items-center justify-center size-5 rounded-lg border-2 transition-all ${
                      visibleSegmentIds.includes(seg.id) 
                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105' 
                        : 'border-muted-foreground/20 bg-background group-hover:border-muted-foreground/40'
                    }`}
                  >
                    {visibleSegmentIds.includes(seg.id) && <Check className='size-3 stroke-[4]' />}
                  </div>
                  <div className='flex flex-col overflow-hidden'>
                    <span className='text-[11px] font-black text-slate-700 truncate uppercase tracking-tight'>{seg.name}</span>
                    <span className='text-[8px] text-muted-foreground/50 font-mono truncate uppercase tracking-widest leading-none mt-0.5'>{seg.lineName}</span>
                  </div>
                </div>
              ))}
              {segments.length === 0 && (
                <div className='col-span-2 py-10 text-center border-2 border-dashed rounded-[32px] border-muted bg-muted/5'>
                  <p className='text-[10px] font-black text-muted-foreground uppercase tracking-widest'>
                    {t('dashboard.page.segmentDialog.emptyTitle')}
                  </p>
                  <p className='text-[9px] mt-1 text-muted-foreground/40 font-black uppercase tracking-tighter'>
                    {t('dashboard.page.segmentDialog.emptyDescription')}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className='sm:justify-end gap-3'>
              <Button 
                variant='ghost' 
                onClick={() => setIsConfigOpen(false)}
                className='rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest bg-muted/30 hover:bg-muted/50 border-none'
              >
                {t('dashboard.page.segmentDialog.cancel')}
              </Button>
              <Button 
                onClick={() => handleSaveConfig(visibleSegmentIds)} 
                className='rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20'
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
