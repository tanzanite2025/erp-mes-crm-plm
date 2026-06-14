import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { DatabaseZap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { getEngineeringMasterTabs } from './engineering-master-tabs'

function findActiveTab(
  pathname: string,
  hrefs: { key: string; href: string }[]
) {
  return [...hrefs]
    .sort((left, right) => right.href.length - left.href.length)
    .find(
      (item) => pathname === item.href || pathname.startsWith(item.href + '/')
    )
}

export function EngineeringMasterLayout() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const tabs = getEngineeringMasterTabs(t)
  const activeTabKey = findActiveTab(pathname, tabs)?.key || tabs[0]?.key

  return (
    <div className='flex animate-in flex-col gap-5 duration-700 fade-in'>
      <IndustrialHeader
        icon={DatabaseZap}
        title={t('engineering.masterData.page.title')}
        description={t('engineering.masterData.page.description')}
      />

      <div className='rounded-[24px] border border-dashed border-muted/30 bg-background/80 p-1.5 shadow-none'>
        <div className='flex flex-wrap gap-1.5'>
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              to={tab.href}
              className={cn(
                'inline-flex h-9 items-center rounded-full px-4 text-[10px] font-black tracking-[0.18em] uppercase transition-all',
                activeTabKey === tab.key
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
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
