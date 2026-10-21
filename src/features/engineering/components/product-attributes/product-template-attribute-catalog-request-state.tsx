import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'

interface ProductTemplateAttributeCatalogRequestStateProps {
  isLoading: boolean
  error: unknown
  onRetry: () => void
}

export function ProductTemplateAttributeCatalogRequestState({
  isLoading,
  error,
  onRetry,
}: ProductTemplateAttributeCatalogRequestStateProps) {
  const { locale } = useLanguage()
  const isZh = locale === 'zh-CN'

  if (error) {
    return (
      <div role='alert' className='space-y-3 rounded-xl border p-5 text-sm'>
        <p>
          {isForbiddenError(error)
            ? isZh
              ? '暂无产品模板属性分类访问权限。'
              : 'You do not have access to product template attribute categories.'
            : isZh
              ? '产品模板属性分类加载失败，请重试。'
              : 'Unable to load product template attribute categories. Please retry.'}
        </p>
        <Button type='button' variant='outline' onClick={onRetry}>
          {isZh ? '重新加载' : 'Retry'}
        </Button>
      </div>
    )
  }

  if (!isLoading) return null

  return (
    <p role='status' className='py-5 text-sm text-muted-foreground'>
      {isZh
        ? '正在加载产品模板属性分类…'
        : 'Loading product template attribute categories…'}
    </p>
  )
}
