import { useLocation } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ModuleHeaderSummary } from '@/components/layout/module-header-summary'
import { ModuleTabs, type TabItem } from '@/components/module-tabs'
import { cn } from '@/lib/utils'

interface ModuleTabbedLayoutProps {
    tabs: TabItem[]
    children: React.ReactNode
    actions?: React.ReactNode
    title?: string
    headerTitle?: string
    headerDescription?: string
    contentClassName?: string
}

function findActiveTab(pathname: string, tabs: TabItem[]): TabItem | undefined {
    return [...tabs]
        .sort((a, b) => b.href.length - a.href.length)
        .find((tab) => pathname === tab.href || pathname.startsWith(tab.href + '/'))
}

export function ModuleTabbedLayout({ tabs, children, actions, headerTitle, headerDescription, contentClassName }: ModuleTabbedLayoutProps) {
    const { pathname } = useLocation()
    const visibleTabs = tabs

    // 找到当前激活的 tab (根据当前路由匹配，优先匹配更长、更具体的路径)
    const activeTabKey = findActiveTab(pathname, visibleTabs)?.key || visibleTabs[0]?.key

    return (
        <div className='flex flex-1 min-h-0 flex-col overflow-hidden'>
            {/* 1. 全局 Header - 确保 z-index 高于二级导航 */}
            <Header fixed className='border-b-0 shadow-none z-50' />

            {/* 2. 模块级多页签 - 增加 pt-14/pt-16 偏移以避让 fixed Header */}
            {/* 3. 主内容区域 - 由于 Header 已经被 ModuleTabs 抵销，此处移除主内容区的 pt-14/16 避免留白过大 */}
            <div className='fixed left-(--header-fixed-left,0px) right-(--header-fixed-right,0px) top-14 z-40 bg-background md:top-16'>
                <ModuleTabs 
                    tabs={visibleTabs} 
                    activeKey={activeTabKey} 
                    actions={actions} 
                    className='border-b border-dashed py-1!'
                />
            </div>

            <div className='h-14 shrink-0' />

            <Main fixed className='flex-1 overflow-y-auto pt-0 pb-5 [scrollbar-gutter:stable_both-edges]'>
                <div className={cn('flex flex-col items-stretch animate-in fade-in duration-700 min-h-0 min-w-0 h-fit', contentClassName)}>
                    {headerTitle ? (
                        <div className='px-1 pt-3 pb-2'>
                            <ModuleHeaderSummary title={headerTitle} description={headerDescription} />
                        </div>
                    ) : null}
                    {children}
                </div>
            </Main>
        </div>
    )
}
