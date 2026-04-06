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
        <div className='flex min-h-[76px] flex-col gap-1 bg-muted/5 p-3 md:min-h-[88px] md:p-4 rounded-2xl md:rounded-[32px] border border-dashed border-muted/50 shrink-0 overflow-hidden'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='flex items-start gap-2 text-primary min-w-0 flex-1'>
                    <Icon className='size-4 md:size-5 text-primary shrink-0' />
                    <h3 className='text-sm md:text-lg font-black tracking-tighter italic uppercase whitespace-normal break-words leading-tight'>
                        {title}
                    </h3>
                </div>
                <div className='flex-shrink-0'>
                    {children}
                </div>
            </div>
            <p className='text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 leading-tight md:leading-snug'>
                {description}
            </p>
        </div>
    )
}
