import { useEffect, useState } from 'react'
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
import { createLogger } from '@/lib/logger'
import { type Segment } from '@/features/production-shared/tabs/line-mgmt/types'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { productionResourceService } from '@/features/production-shared/services/production-resource-service'

const VISIBLE_SEGMENTS_KEY = 'xdfc_dashboard_visible_segments'
const logger = createLogger('DashboardOverviewTab')

/**
 * 核心逻辑重构：从后端拉取产线并展平为工段列表
 * 遵循“后端权威”原则，彻底移除本地 LINE_STORAGE_KEY。
 */
async function fetchRemoteSegments(): Promise<(Segment & { lineName: string })[]> {
  try {
    const lines = await productionResourceService.getLines()
    return lines.flatMap((line) =>
      (line.segments || []).map((segment) => ({
        ...segment,
        lineName: line.name,
      })),
    )
  } catch (error) {
    logger.error('Failed to fetch production lines', error)
    throw error // 向上抛出以触发 Fail Loudly
  }
}

export function DashboardOverviewTab() {
  const { t } = useLanguage()
  const [segments, setSegments] = useState<(Segment & { lineName: string })[]>([])
  const [visibleSegmentIds, setVisibleSegmentIds] = useState<string[]>([])
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const allSegments = await fetchRemoteSegments()
      setSegments(allSegments)

      const saved = await StorageService.getItem<string[]>(VISIBLE_SEGMENTS_KEY)
      if (saved) {
        setVisibleSegmentIds(saved)
        return
      }

      if (allSegments.length > 0) {
        const defaults = allSegments.slice(0, 5).map((segment) => segment.id)
        setVisibleSegmentIds(defaults)
        await StorageService.setItem(VISIBLE_SEGMENTS_KEY, defaults)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load production lines')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleSaveConfig = async (ids: string[]) => {
    setVisibleSegmentIds(ids)
    await StorageService.setItem(VISIBLE_SEGMENTS_KEY, ids)
    window.dispatchEvent(new CustomEvent('xdfc_dashboard_visible_segments_updated'))
    setIsConfigOpen(false)
  }

  const chartData = segments
    .filter((segment) => visibleSegmentIds.includes(segment.id))
    .map((segment) => ({
      name: segment.name,
      total: 0,
    }))

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center h-64 gap-3 animate-in fade-in duration-500'>
        <Loader2 className='size-8 animate-spin text-primary opacity-60' />
        <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
          {t('common.loading' as any)}
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
            {error}
          </p>
        </div>
        <Button 
          variant='outline' 
          onClick={() => loadData()}
          className='rounded-full h-9 px-8 text-[10px] font-black uppercase tracking-widest border-destructive/20 text-destructive hover:bg-destructive/10'
        >
          {t('common.retry' as any)}
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
        </div>
      </div>

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

            <div className='max-h-[40vh] overflow-y-auto px-1'>
              <div className='grid grid-cols-2 gap-3 py-2'>
                {segments.map((segment) => (
                  <div
                    key={segment.id}
                    className={`flex items-center space-x-3 p-3 border-dashed border-2 rounded-2xl transition-all cursor-pointer group ${
                      visibleSegmentIds.includes(segment.id) 
                        ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/10' 
                        : 'bg-muted/5 border-muted/40 hover:border-muted/80'
                    }`}
                    onClick={() => {
                      const newIds = visibleSegmentIds.includes(segment.id)
                        ? visibleSegmentIds.filter((id) => id !== segment.id)
                        : [...visibleSegmentIds, segment.id]
                      setVisibleSegmentIds(newIds)
                    }}
                  >
                    <div className={`size-5 rounded-lg flex items-center justify-center border-2 transition-all ${
                      visibleSegmentIds.includes(segment.id)
                        ? 'bg-primary border-primary'
                        : 'bg-transparent border-muted-foreground/20 group-hover:border-muted-foreground/40'
                    }`}>
                      {visibleSegmentIds.includes(segment.id) && <Check className='size-3 text-white' />}
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
                onClick={() => handleSaveConfig(visibleSegmentIds)}
                className='w-full rounded-full h-11 font-black text-[10px] uppercase tracking-widest'
              >
                {t('common.confirm' as any)}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
