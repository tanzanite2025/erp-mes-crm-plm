import { lazy, Suspense, useState, type ReactNode } from 'react'
import { useLanguage } from '@/context/language-provider'

const ProductCreationOperationGuideDialog = lazy(() =>
  import('./product-creation-operation-guide-dialog').then((module) => ({
    default: module.ProductCreationOperationGuideDialog,
  }))
)

export function ProductCreationOperationGuideLauncher({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <button
        type='button'
        className={className}
        onClick={() => setIsOpen(true)}
      >
        {children}
      </button>
      {isOpen && (
        <Suspense
          fallback={
            <p role='status' className='p-3 text-sm text-muted-foreground'>
              {t('engineering.productCreationGuide.loading')}
            </p>
          }
        >
          <ProductCreationOperationGuideDialog
            onClose={() => setIsOpen(false)}
          />
        </Suspense>
      )}
    </>
  )
}
