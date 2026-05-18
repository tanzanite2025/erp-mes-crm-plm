import { useLanguage } from '@/context/language-provider'

export function RecentSales() {
  const { t } = useLanguage()

  return (
    <div className='space-y-8'>
      <div className='flex items-center gap-4'>
        <div className='flex flex-1 flex-wrap items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-sm leading-none font-medium'>SN: DEMO-20260129-001</p>
            <p className='text-sm text-muted-foreground'>
              {t('dashboard.page.recentSales.process')}：[FQC质检] - {t('dashboard.page.recentSales.result')}：{t('dashboard.page.recentSales.demo.pass')}
            </p>
          </div>
          <div className='font-medium text-xs text-muted-foreground'>{t('dashboard.page.recentSales.timeUnit.minutes', { count: 2 })}</div>
        </div>
      </div>
      <div className='flex items-center gap-4'>
        <div className='flex flex-1 flex-wrap items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-sm leading-none font-medium'>SN: DEMO-20260128-892</p>
            <p className='text-sm text-muted-foreground'>
              {t('dashboard.page.recentSales.process')}：[出库] - {t('dashboard.page.recentSales.order')}：SO-9921
            </p>
          </div>
          <div className='font-medium text-xs text-muted-foreground'>{t('dashboard.page.recentSales.timeUnit.minutes', { count: 10 })}</div>
        </div>
      </div>
      <div className='flex items-center gap-4'>
        <div className='flex flex-1 flex-wrap items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-sm leading-none font-medium text-red-500'>SN: DEMO-20260129-045</p>
            <p className='text-sm text-muted-foreground'>
              {t('dashboard.page.recentSales.process')}：[热压] - {t('dashboard.page.recentSales.note')}：**{t('dashboard.page.recentSales.demo.lost')}**
            </p>
          </div>
          <div className='font-medium text-xs text-muted-foreground'>{t('dashboard.page.recentSales.timeUnit.minutes', { count: 15 })}</div>
        </div>
      </div>
      <div className='flex items-center gap-4'>
        <div className='flex flex-1 flex-wrap items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-sm leading-none font-medium'>SN: DEMO-20260129-102</p>
            <p className='text-sm text-muted-foreground'>
              {t('dashboard.page.recentSales.process')}：[精修] - {t('dashboard.page.recentSales.owner')}：{t('dashboard.page.recentSales.demo.name')}
            </p>
          </div>
          <div className='font-medium text-xs text-muted-foreground'>{t('dashboard.page.recentSales.timeUnit.minutes', { count: 22 })}</div>
        </div>
      </div>
      <div className='flex items-center gap-4'>
        <div className='flex flex-1 flex-wrap items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-sm leading-none font-medium'>SN: DEMO-20251210-441</p>
            <p className='text-sm text-muted-foreground'>
              {t('dashboard.page.recentSales.process')}：[入库] - {t('dashboard.page.recentSales.location')}：A-04-12
            </p>
          </div>
          <div className='font-medium text-xs text-muted-foreground'>{t('dashboard.page.recentSales.timeUnit.hours', { count: 1 })}</div>
        </div>
      </div>
    </div>
  )
}
