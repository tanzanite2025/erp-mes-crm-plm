import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'

export function MaintenanceError() {
  const { t } = useLanguage()
  return (
    <div className='h-full flex-1'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2 py-12'>
        <h1 className='text-[7rem] leading-tight font-bold'>503</h1>
        <span className='font-medium'>{t('errors.maintenance.subtitle')}</span>
        <p className='text-center text-muted-foreground'>
          {t('errors.maintenance.description')}
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline'>{t('common.actions.preview')}</Button>
        </div>
      </div>
    </div>
  )
}
