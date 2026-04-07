import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SimpleBarList } from './common/simple-bar-list'
import { useAssets } from '@/features/equipment-tooling/hooks/use-assets'
import { useTraceStats } from '../hooks/use-trace-stats'
import { Info, Loader2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

export function Analytics() {
  const { t } = useLanguage()
  const { molds } = useAssets()
  const { stats, loading } = useTraceStats()

  // 处理模具频率数据：取 Top 5 累计寿命
  const moldUsageItems = [...molds]
    .sort((a, b) => (b.totalLifeCycles || 0) - (a.totalLifeCycles || 0))
    .slice(0, 5)
    .map(m => ({
      name: m.sn,
      value: m.totalLifeCycles || 0
    }))

  return (
    <div className='flex flex-col gap-6'>
      <Card className='rounded-2xl md:rounded-[32px] border-dashed border-2 border-muted/60 bg-muted/5 shadow-none overflow-hidden'>
        <CardHeader className='px-4 md:px-6 py-4 border-b border-dashed border-muted/80'>
          <CardTitle className='text-lg md:text-xl font-black uppercase tracking-tighter text-slate-800 italic'>
            {t('dashboard.page.analytics.funnel.title')}
          </CardTitle>
          <CardDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
            {t('dashboard.page.analytics.funnel.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className='p-4 md:p-6 bg-background/30'>
          {loading ? (
            <div className='py-12 flex flex-col items-center justify-center border-2 border-dashed rounded-[24px] border-muted/40 bg-muted/5'>
              <Loader2 className='size-8 text-primary animate-spin mb-2' />
              <p className='text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest'>
                {t('dashboard.page.analytics.states.syncing')}
              </p>
            </div>
          ) : stats?.productionFunnel ? (
            <SimpleBarList
              items={stats.productionFunnel.map((item) => {
                // 增加防御性映射，处理可能存在的旧版本硬编码标签或缓存数据
                const stageMap: Record<string, string> = {
                  '待下发 (PENDING)': 'pending',
                  '生产阶段 (PRODUCTION)': 'inprogress',
                  '已交库 (COMPLETED)': 'done',
                  '已交付 (DELIVERED)': 'delivered',
                  'pending': 'pending',
                  'inprogress': 'inprogress',
                  'done': 'done',
                  'delivered': 'delivered'
                }
                const key = stageMap[item.name] || item.name
                
                return {
                  ...item,
                  name: t(`dashboard.page.analytics.funnel.stages.${key}` as any)
                }
              })}
              barClass='bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.3)] h-3 rounded-full'
              valueFormatter={(n) => `${n} ${t('dashboard.page.analytics.units.order')}`}
            />
          ) : (
            <div className='py-12 text-center border-2 border-dashed rounded-[24px] border-muted/40 bg-muted/5'>
               <Info className='size-10 text-muted-foreground/20 mx-auto mb-3' />
               <p className='text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest'>
                 {t('dashboard.page.analytics.states.noActiveStream')}
               </p>
               <p className='text-[9px] text-muted-foreground/20 mt-1 uppercase italic'>
                 {t('dashboard.page.analytics.states.waitingOrder')}
               </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className='grid gap-6 sm:grid-cols-2'>
        <Card className='rounded-2xl md:rounded-[32px] border-dashed border-2 border-muted/60 bg-muted/5 shadow-none overflow-hidden'>
          <CardHeader className='px-4 md:px-6 py-4 border-b border-dashed border-muted/80'>
            <CardTitle className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('dashboard.page.analytics.scrapWorkshop.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className='p-4 md:p-6 bg-background/30'>
            <div className='h-[160px] flex flex-col items-center justify-center border-2 border-dashed rounded-[24px] border-muted/40 bg-muted/5'>
               <p className='text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest'>
                 {t('dashboard.page.analytics.states.noQualityData')}
               </p>
               <p className='text-[9px] text-muted-foreground/20 mt-1 uppercase italic'>
                 {t('dashboard.page.analytics.states.waitingQuality')}
               </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className='rounded-2xl md:rounded-[32px] border-dashed border-2 border-muted/60 bg-muted/5 shadow-none overflow-hidden'>
          <CardHeader className='px-4 md:px-6 py-4 border-b border-dashed border-muted/80'>
            <CardTitle className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('dashboard.page.analytics.moldFrequency.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className='p-4 md:p-6 bg-background/30'>
            {moldUsageItems.length > 0 ? (
              <SimpleBarList
                items={moldUsageItems}
                barClass='bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)] h-2 rounded-full font-black'
                valueFormatter={(n) => `${n} ${t('dashboard.page.analytics.units.cycle')}`}
              />
            ) : (
              <div className='h-[160px] flex flex-col items-center justify-center border-2 border-dashed rounded-[24px] border-muted/40 bg-muted/5'>
                <p className='text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest'>
                  {t('dashboard.page.analytics.states.noAssetRecords')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

