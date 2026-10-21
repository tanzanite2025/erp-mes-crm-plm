import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'

export function ProductAppearanceCatalogRequestState({
  isLoading,
  error,
  onRetry,
}: {
  isLoading: boolean
  error: unknown
  onRetry: () => void
}) {
  const { t } = useLanguage()
  if (error)
    return (
      <div
        role='alert'
        className='space-y-3 rounded-[20px] border border-dashed border-destructive/20 bg-destructive/5 p-4 text-xs'
      >
        <p>{t('engineering.productAppearance.toasts.loadFailed')}</p>
        <Button
          type='button'
          variant='outline'
          className='h-8 rounded-full px-4 text-[10px] font-black'
          onClick={onRetry}
        >
          {t('engineering.productAppearance.actions.retry')}
        </Button>
      </div>
    )
  if (isLoading)
    return (
      <p role='status' className='py-5 text-xs text-muted-foreground'>
        {t('engineering.productAppearance.toasts.loading')}
      </p>
    )
  return null
}
