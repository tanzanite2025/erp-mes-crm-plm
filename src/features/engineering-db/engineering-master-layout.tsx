import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { DatabaseZap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { getEngineeringMasterTabs } from './engineering-master-tabs'

function findActiveTab(pathname: string, hrefs: { key: string; href: string }[]) {
  return [...hrefs]
    .sort((left, right) => right.href.length - left.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
}

export function EngineeringMasterLayout() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const tabs = getEngineeringMasterTabs(t)
  const activeTabKey = findActiveTab(pathname, tabs)?.key || tabs[0]?.key

  return (
    <div className='flex flex-col gap-6 animate-in fade-in duration-700'>
      <div className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-5 sm:p-6'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='space-y-3'>
            <div className='flex items-center gap-3 text-primary'>
              <div className='flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10'>
                <DatabaseZap className='size-5' />
              </div>
              <div>
                <div className='text-lg font-black tracking-tight italic'>
                  {t('engineering.masterData.page.title')}
                </div>
                <div className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>
                  {t('engineering.masterData.page.description')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='rounded-[28px] border border-dashed border-muted/40 bg-background/80 p-2 shadow-sm'>
        <div className='flex flex-wrap gap-2'>
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              to={tab.href}
              className={cn(
                'inline-flex h-10 items-center rounded-full px-5 text-[10px] font-black uppercase tracking-[0.18em] transition-all',
                activeTabKey === tab.key
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  )
}
