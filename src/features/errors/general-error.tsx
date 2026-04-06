import { useNavigate, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  minimal?: boolean
}

export function GeneralError({
  className,
  minimal = false,
}: GeneralErrorProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className={cn('flex-1 h-full w-full', className)}>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2 py-12'>
        {!minimal && (
          <h1 className='text-[7rem] leading-tight font-bold'>{t('errors.general.title')}</h1>
        )}
        <span className='font-medium'>{t('errors.general.subtitle')}</span>
        <p className='text-center text-muted-foreground'>
          {t('errors.general.description')}
        </p>
        {!minimal && (
          <div className='mt-6 flex gap-4'>
            <Button variant='outline' onClick={() => history.go(-1)}>
              {t('errors.general.goBack')}
            </Button>
            <Button onClick={() => navigate({ to: '/' })}>{t('errors.general.backHome')}</Button>
          </div>
        )}
      </div>
    </div>
  )
}
