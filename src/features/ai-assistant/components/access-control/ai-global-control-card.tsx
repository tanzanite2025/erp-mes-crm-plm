import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface AiGlobalControlCardProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  className?: string
}

export function AiGlobalControlCard({
  enabled,
  onEnabledChange,
  className,
}: AiGlobalControlCardProps) {
  const { t } = useLanguage()

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/10 shadow-none md:rounded-[32px]',
        className
      )}
    >
      <CardHeader className='border-b border-dashed border-indigo-100 p-4 md:p-5'>
        <CardTitle className='text-[11px] font-black tracking-tight uppercase italic md:text-sm'>
          {t('aiAssistant.accessControl.global.title')}
        </CardTitle>
        <CardDescription className='text-[8px] font-bold tracking-widest text-indigo-400 uppercase md:text-[9px]'>
          {t('aiAssistant.accessControl.global.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className='p-4 md:p-5'>
        <div className='flex flex-col gap-4 rounded-2xl border border-indigo-50 bg-white p-4 shadow-sm'>
          <div className='flex min-w-0 items-center gap-3'>
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                enabled
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-400'
              )}
            >
              <Sparkles className='size-5' />
            </div>
            <div className='min-w-0 flex-1'>
              <p className='text-sm leading-tight font-bold text-slate-700'>
                {enabled
                  ? t('aiAssistant.accessControl.global.enabledTitle')
                  : t('aiAssistant.accessControl.global.disabledTitle')}
              </p>
              <p className='text-[10px] font-medium text-slate-400'>
                {t('aiAssistant.accessControl.global.hint')}
              </p>
            </div>
          </div>
          <Button
            type='button'
            variant={enabled ? 'destructive' : 'default'}
            className='h-9 w-full rounded-full px-3 text-[10px] font-black tracking-widest uppercase'
            onClick={() => onEnabledChange(!enabled)}
          >
            {enabled
              ? t('aiAssistant.accessControl.global.disable')
              : t('aiAssistant.accessControl.global.enable')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
