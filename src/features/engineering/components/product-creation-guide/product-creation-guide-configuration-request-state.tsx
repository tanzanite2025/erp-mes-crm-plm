import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'

export function ProductCreationGuideConfigurationRequestState({
  isLoading,
  error,
  onRetry,
  errorDescription,
}: {
  isLoading: boolean
  error: unknown
  onRetry: () => void
  errorDescription?: string
}) {
  const { t } = useLanguage()
  if (error)
    return (
      <div
        role='alert'
        className='space-y-2 rounded-lg bg-destructive/5 p-3 text-sm'
      >
        <p>
          {errorDescription ?? t('engineering.productCreationGuide.loadFailed')}
        </p>
        <Button
          size='sm'
          variant='outline'
          className='rounded-full'
          onClick={onRetry}
        >
          {t('engineering.productCreationGuide.retry')}
        </Button>
      </div>
    )
  if (isLoading)
    return (
      <p role='status' className='text-sm text-muted-foreground'>
        {t('engineering.productCreationGuide.loading')}
      </p>
    )
  return null
}
