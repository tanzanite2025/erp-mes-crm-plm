import * as React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export interface SegmentedTabItem {
    value: string
    label: React.ReactNode
    icon?: React.ReactNode
}

interface SegmentedTabsProps {
    tabs: SegmentedTabItem[]
    value: string
    onValueChange: (value: string) => void
    className?: string
    listClassName?: string
}

/**
 * 分段切换 Tabs 组件 (Segmented Control)
 * 复刻实验测试中心的药丸式切换效果，具备高对比度激活态与丝滑交互感。
 */
export function SegmentedTabs({
    tabs,
    value,
    onValueChange,
    className,
    listClassName,
}: SegmentedTabsProps) {
    return (
        <Tabs
            value={value}
            onValueChange={onValueChange}
            className={cn('w-full md:w-fit overflow-hidden', className)}
        >
            <TabsList 
                className={cn(
                    'flex h-11 w-full items-center justify-start rounded-full p-1 transition-all overflow-x-auto overflow-y-hidden whitespace-nowrap',
                    'bg-slate-100/50 border-slate-200 shadow-inner',
                    'dark:bg-white/[0.04] dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl',
                    // 隐藏滚动条 (webkit / firefox / ms)
                    '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
                    listClassName
                )}
            >
                {tabs.map((tab) => (
                    <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className={cn(
                            'inline-flex items-center justify-center gap-2 rounded-full px-6 py-1.5 text-sm font-medium transition-all duration-300',
                            'text-muted-foreground hover:text-foreground',
                            'dark:text-slate-400 dark:hover:text-white',
                            'data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-slate-200',
                            'dark:data-[state=active]:bg-white/[0.12] dark:data-[state=active]:text-white dark:data-[state=active]:border-white/20',
                            'whitespace-nowrap'
                        )}
                    >
                        {tab.icon && <span className="shrink-0 opacity-80">{tab.icon}</span>}
                        <span>{tab.label}</span>
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    )
}
