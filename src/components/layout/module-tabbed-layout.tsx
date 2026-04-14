import { useLocation } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ModuleHeaderSummary } from '@/components/layout/module-header-summary'
import { ModuleTabs, type TabItem } from '@/components/module-tabs'

interface ModuleTabbedLayoutProps {
    tabs: TabItem[]
    children: React.ReactNode
    actions?: React.ReactNode
    title?: string
    headerTitle?: string
    headerDescription?: string
}

function findActiveTab(pathname: string, tabs: TabItem[]): TabItem | undefined {
    return [...tabs]
        .sort((a, b) => b.href.length - a.href.length)
        .find((tab) => pathname === tab.href || pathname.startsWith(tab.href + '/'))
}

export function ModuleTabbedLayout({ tabs, children, actions, title, headerTitle, headerDescription }: ModuleTabbedLayoutProps) {
    const { pathname } = useLocation()
    const visibleTabs = tabs

    // 找到当前激活的 tab (根据当前路由匹配，优先匹配更长、更具体的路径)
    const activeTabKey = findActiveTab(pathname, visibleTabs)?.key || visibleTabs[0]?.key

    return (
        <>
            {/* 1. 全局 Header - 确保 z-index 高于二级导航 */}
            <Header fixed className='border-b-0 shadow-none z-50' />

            {/* 2. 模块级多页签 - 增加 pt-14/pt-16 偏移以避让 fixed Header */}
            <div className='h-12 md:h-[52px] bg-background'>
                <ModuleTabs 
                    tabs={visibleTabs} 
                    activeKey={activeTabKey} 
                    actions={actions} 
                    className='border-b border-dashed py-1! px-4!'
                />
            </div>

            {/* 3. 主内容区域 - 由于 Header 已经被 ModuleTabs 抵销，此处移除主内容区的 pt-14/16 避免留白过大 */}
            <Main className='flex-1 overflow-y-auto pt-0 pb-5'>
                <div className='flex flex-col items-stretch animate-in fade-in duration-700 min-h-0 min-w-0 h-fit'>
                    {headerTitle ? (
                        <div className='px-1 pt-3 pb-2'>
                            <ModuleHeaderSummary title={headerTitle} description={headerDescription} />
                        </div>
                    ) : null}
                    {title ? (
                        <div className='px-1 pt-3 pb-2'>
                            <p className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>
                                {title}
                            </p>
                        </div>
                    ) : null}
                    {children}
                </div>
            </Main>
        </>
    )
}
