import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useScanActivityStore } from '../stores/scan-activity-store'
import { useLanguage } from '@/context/language-provider'

export function TraceActivityList() {
    const { t } = useLanguage()
    const activities = useScanActivityStore((state) => state.activities)

    return (
        <ScrollArea className='h-[350px] pr-4'>
            <div className='space-y-6'>
                {activities.length > 0 ? (
                    activities.map((activity) => (
                        <div key={activity.id} className='flex items-center gap-4 group cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors'>
                            <div className='flex flex-1 flex-wrap items-center justify-between gap-2'>
                                <div className='space-y-1'>
                                    <p className={`text-sm leading-none font-medium ${activity.type === 'success' ? 'text-emerald-600' : ''}`}>
                                        CODE: {activity.rawCode}
                                    </p>
                                    <div className='flex items-center gap-2'>
                                        <Badge variant='outline' className='text-[10px] px-1 py-0'>
                                            {activity.process}
                                        </Badge>
                                        <p className='text-sm text-muted-foreground'>
                                            {activity.result}
                                        </p>
                                    </div>
                                    <p className='text-[10px] text-muted-foreground/70'>{activity.description}</p>
                                </div>
                                <div className='font-medium text-xs text-muted-foreground whitespace-nowrap'>{activity.time}</div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className='flex flex-col items-center justify-center h-48 text-muted-foreground'>
                        <div className='size-12 rounded-full bg-muted flex items-center justify-center mb-3 animate-pulse'>
                            <div className='size-6 rounded-full bg-muted-foreground/20' />
                        </div>
                        <p className='text-xs font-bold uppercase tracking-widest'>{t('dashboard.page.activities.empty')}</p>
                        <p className='text-[10px] mt-1 opacity-50 italic uppercase tracking-tighter'>{t('dashboard.page.activities.waiting')}</p>
                    </div>
                )}
            </div>
        </ScrollArea>
    )
}
