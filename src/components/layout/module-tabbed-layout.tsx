import { useMemo } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ModuleTabs, type TabItem } from '@/components/module-tabs'
import { getProjectedTabsFromPermissionSnapshot } from '@/features/authz/guards/route-access'

interface ModuleTabbedLayoutProps {
  tabs: TabItem[]
  children: React.ReactNode
  actions?: React.ReactNode
  title?: string
  contentClassName?: string
}

function findActiveTab(pathname: string, tabs: TabItem[]): TabItem | undefined {
  return [...tabs]
    .sort((a, b) => b.href.length - a.href.length)
    .find((tab) => pathname === tab.href || pathname.startsWith(tab.href + '/'))
}

export function ModuleTabbedLayout({
  tabs,
  children,
  actions,
  contentClassName,
}: ModuleTabbedLayoutProps) {
  const { pathname } = useLocation()
  const user = useAuthStore((state) => state.user)
  const isIdentitySynced = useAuthStore((state) => state.isIdentitySynced)
  const visibleTabs = useMemo(
    () =>
      isIdentitySynced
        ? getProjectedTabsFromPermissionSnapshot(user, tabs)
        : tabs,
    [isIdentitySynced, tabs, user]
  )

  // 找到当前激活的 tab (根据当前路由匹配，优先匹配更长、更具体的路径)
  const activeTabKey =
    findActiveTab(pathname, visibleTabs)?.key || visibleTabs[0]?.key

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      {/* 1. 全局 Header - 确保 z-index 高于二级导航 */}
      <Header fixed className='z-50 border-b-0 shadow-none' />

      {/* 2. 模块级多页签 - 增加 pt-14/pt-16 偏移以避让 fixed Header */}
      {/* 3. 主内容区域 - 由于 Header 已经被 ModuleTabs 抵销，此处移除主内容区的 pt-14/16 避免留白过大 */}
      <div className='fixed top-14 right-(--header-fixed-right,0px) left-(--header-fixed-left,0px) z-40 bg-background md:top-16'>
        <ModuleTabs
          tabs={visibleTabs}
          activeKey={activeTabKey}
          actions={actions}
          className='border-b border-dashed py-1!'
        />
      </div>

      <div className='h-14 shrink-0' />

      <Main
        fixed
        className='flex-1 overflow-y-auto pt-0 pb-5 [scrollbar-gutter:stable_both-edges]'
      >
        <div
          className={cn(
            'flex h-fit min-h-0 min-w-0 animate-in flex-col items-stretch duration-700 fade-in',
            contentClassName
          )}
        >
          {children}
        </div>
      </Main>
    </div>
  )
}
