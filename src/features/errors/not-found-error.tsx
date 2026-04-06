import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'

export function NotFoundError() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className='flex-1 h-full'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2 py-12'>
        <h1 className='text-[7rem] leading-tight font-bold'>{t('errors.notFound.title')}</h1>
        <span className='font-medium'>{t('errors.notFound.subtitle')}</span>
        <p className='text-center text-muted-foreground'>
          {t('errors.notFound.description')}
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            {t('errors.notFound.goBack')}
          </Button>
          <Button onClick={() => navigate({ to: '/' })}>{t('errors.notFound.backHome')}</Button>
        </div>
      </div>
    </div>
  )
}
