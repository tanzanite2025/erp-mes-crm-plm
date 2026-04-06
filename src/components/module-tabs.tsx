import { useRef, useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export interface TabItem {
    key: string
    label: string
    href: string
    permissionId?: string
}

interface ModuleTabsProps {
    tabs: TabItem[]
    activeKey?: string
    className?: string
    actions?: React.ReactNode
}

/**
 * 演示系统专用：可复用的多页签组件
 * 已优化：全平台强制单行显示，支持智能横向滑动与视觉提示（渐变+箭头）
 */
export function ModuleTabs({ tabs, activeKey, className, actions }: ModuleTabsProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [showLeftArrow, setShowLeftArrow] = useState(false)
    const [showRightArrow, setShowRightArrow] = useState(false)

    // 检测滚动状态
    const checkScroll = () => {
        const container = scrollContainerRef.current
        if (container) {
            const { scrollLeft, scrollWidth, clientWidth } = container
            setShowLeftArrow(scrollLeft > 5)
            setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5)
        }
    }

    useEffect(() => {
        const container = scrollContainerRef.current
        if (container) {
            checkScroll()
            container.addEventListener('scroll', checkScroll)
            window.addEventListener('resize', checkScroll)
            
            // 初始检测可能需要一点延迟待 DOM 渲染完成
            const timer = setTimeout(checkScroll, 100)
            return () => {
                container.removeEventListener('scroll', checkScroll)
                window.removeEventListener('resize', checkScroll)
                clearTimeout(timer)
            }
        }
    }, [tabs])

    const scroll = (direction: 'left' | 'right') => {
        const container = scrollContainerRef.current
        if (container) {
            const scrollAmount = direction === 'left' ? -200 : 200
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
        }
    }

    return (
        <div className={cn(
            'w-auto border-b bg-background/95 backdrop-blur fixed top-14 md:top-16 right-0 z-40 px-4 py-3',
            'transition-all duration-300 ease-in-out',
            'left-0 md:left-(--header-fixed-left,var(--sidebar-width))',
            className
        )}>
            <div className='flex items-center justify-between gap-4 min-w-0 w-full overflow-hidden'>
                <div className="relative flex-1 min-w-0 group">
                    {/* 左侧遮罩与箭头 */}
                    {showLeftArrow && (
                        <>
                            <div className="absolute left-0 top-0 bottom-0 w-12 bg-linear-to-r from-background to-transparent z-10 pointer-events-none" />
                            <button 
                                onClick={() => scroll('left')}
                                className="absolute left-1 top-1/2 -translate-y-1/2 z-20 size-8 flex items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 shadow-md border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100"
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                        </>
                    )}

                    <Tabs value={activeKey || ''} className='grid grid-cols-1 w-full'>
                        <TabsList 
                            ref={scrollContainerRef}
                            className={cn(
                                'flex flex-nowrap h-auto min-h-11 items-center justify-start rounded-2xl p-1 gap-1 transition-all w-full',
                                'overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                                'bg-slate-100/50 border-slate-200 shadow-inner',
                                'dark:bg-white/5 dark:backdrop-blur-xl dark:border-white/10'
                            )}
                        >
                            {tabs.map((tab) => (
                                <TabsTrigger
                                    key={tab.key}
                                    value={tab.key}
                                    className={cn(
                                        'inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-medium transition-all duration-300 shrink-0 whitespace-nowrap',
                                        'text-muted-foreground hover:text-foreground',
                                        'dark:text-slate-400 dark:hover:text-white',
                                        'data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-slate-200',
                                        'dark:data-[state=active]:bg-white/12 dark:data-[state=active]:text-white dark:data-[state=active]:border-white/20'
                                    )}
                                    asChild
                                >
                                    <Link to={tab.href}>{tab.label}</Link>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    {/* 右侧遮罩与箭头 */}
                    {showRightArrow && (
                        <>
                            <div className="absolute right-0 top-0 bottom-0 w-12 bg-linear-to-l from-background to-transparent z-10 pointer-events-none" />
                            <button 
                                onClick={() => scroll('right')}
                                className="absolute right-1 top-1/2 -translate-y-1/2 z-20 size-8 flex items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 shadow-md border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        </>
                    )}
                </div>

                {actions && (
                    <div className='flex items-center gap-2 shrink-0'>
                        {actions}
                    </div>
                )}
            </div>
        </div>
    )
}
