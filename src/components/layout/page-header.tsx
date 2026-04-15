import { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
    title: string
    description: string
    icon: LucideIcon
    children?: React.ReactNode
}

/**
 * XDFC UDS 1.0 标准页眉组件
 * 特性：32px 物理大圆角, 虚线边框, 斜体高张力标题
 */
export function PageHeader({ title, description, icon: Icon, children }: PageHeaderProps) {
    return (
        <div className='flex min-h-[76px] flex-col gap-2 overflow-hidden rounded-[28px] border border-dashed border-border/50 bg-background/80 p-3 md:min-h-[88px] md:p-4'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='flex min-w-0 flex-1 items-start gap-2 text-primary'>
                    <Icon className='size-4 shrink-0 text-primary md:size-5' />
                    <h3 className='break-words text-sm font-semibold italic leading-tight tracking-tight md:text-lg'>
                        {title}
                    </h3>
                </div>
                <div className='flex-shrink-0'>
                    {children}
                </div>
            </div>
            <p className='text-[10px] font-medium leading-5 text-muted-foreground/80 md:text-xs md:leading-6'>
                {description}
            </p>
        </div>
    )
}
