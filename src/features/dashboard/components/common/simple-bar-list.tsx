interface SimpleBarListItem {
    name: string
    value: number
}

interface SimpleBarListProps {
    items: SimpleBarListItem[]
    valueFormatter: (n: number) => string
    barClass?: string
}

export function SimpleBarList({
    items,
    valueFormatter,
    barClass = 'bg-primary',
}: SimpleBarListProps) {
    const max = Math.max(...items.map((i) => i.value), 1)
    return (
        <ul className='space-y-4'>
            {items.map((i) => {
                const width = `${Math.round((i.value / max) * 100)}%`
                return (
                    <li key={i.name} className='flex items-center justify-between gap-3 group px-1 py-0.5 rounded-md hover:bg-muted/30 transition-colors'>
                        <div className='min-w-0 flex-1'>
                            <div className='mb-1.5 flex items-center justify-between truncate text-xs text-muted-foreground'>
                                <span>{i.name}</span>
                                <span className='font-medium tabular-nums text-foreground'>
                                    {valueFormatter(i.value)}
                                </span>
                            </div>
                            <div className='h-2 w-full rounded-full bg-muted overflow-hidden'>
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ease-out ${barClass}`}
                                    style={{ width }}
                                />
                            </div>
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}
