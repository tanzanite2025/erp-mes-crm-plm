import { ReactNode } from 'react'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card'

interface ChartWrapperProps {
    title: string
    description?: string
    children: ReactNode
    className?: string
    headerExtra?: ReactNode
}

export function ChartWrapper({
    title,
    description,
    children,
    className,
    headerExtra,
}: ChartWrapperProps) {
    return (
        <Card className={className}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0'>
                <div className='space-y-1'>
                    <CardTitle>{title}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </div>
                {headerExtra && <div>{headerExtra}</div>}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}
