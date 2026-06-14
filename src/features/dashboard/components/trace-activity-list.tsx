import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useScanActivityStore } from '../stores/scan-activity-store'

export function TraceActivityList() {
  const { t } = useLanguage()
  const activities = useScanActivityStore((state) => state.activities)

  return (
    <ScrollArea className='h-[350px] pr-4'>
      <div className='space-y-6'>
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div
              key={activity.id}
              className='group flex cursor-pointer items-center gap-4 rounded-lg p-2 transition-colors hover:bg-muted/50'
            >
              <div className='flex flex-1 flex-wrap items-center justify-between gap-2'>
                <div className='space-y-1'>
                  <p
                    className={`text-sm leading-none font-medium ${activity.type === 'success' ? 'text-emerald-600' : ''}`}
                  >
                    CODE: {activity.rawCode}
                  </p>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='px-1 py-0 text-[10px]'>
                      {activity.process}
                    </Badge>
                    <p className='text-sm text-muted-foreground'>
                      {activity.result}
                    </p>
                  </div>
                  <p className='text-[10px] text-muted-foreground/70'>
                    {activity.description}
                  </p>
                </div>
                <div className='text-xs font-medium whitespace-nowrap text-muted-foreground'>
                  {activity.time}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className='flex h-48 flex-col items-center justify-center text-muted-foreground'>
            <div className='mb-3 flex size-12 animate-pulse items-center justify-center rounded-full bg-muted'>
              <div className='size-6 rounded-full bg-muted-foreground/20' />
            </div>
            <p className='text-xs font-bold tracking-widest uppercase'>
              {t('dashboard.page.activities.empty')}
            </p>
            <p className='mt-1 text-[10px] tracking-tighter uppercase italic opacity-50'>
              {t('dashboard.page.activities.waiting')}
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
