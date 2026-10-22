import { Link } from '@tanstack/react-router'
import { BookOpen, ListChecks } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { ProductCreationOperationGuideLauncher } from './product-creation-operation-guide-launcher'

export function ProductManagementCreationGuideEntry() {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)

  if (
    !matchesPathPermissionProjection(
      user,
      '/engineering/product-creation-guide'
    )
  ) {
    return null
  }

  return (
    <div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1'>
      <p className='text-xs leading-5 text-muted-foreground'>
        {t('engineering.productCreationGuide.productManagementEntryHint')}
      </p>
      <div className='flex flex-wrap items-center gap-1.5'>
        <ProductCreationOperationGuideLauncher
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'rounded-full border-blue-600/20 bg-blue-600/5 px-3 text-blue-700 hover:bg-blue-600/10 dark:text-blue-300'
          )}
        >
          <ListChecks aria-hidden='true' className='size-3.5' />
          {t('engineering.productCreationGuide.guidedCreation')}
        </ProductCreationOperationGuideLauncher>
        <Button asChild variant='ghost' size='sm' className='rounded-full px-3'>
          <Link to='/engineering/product-creation-guide'>
            <BookOpen aria-hidden='true' className='size-3.5' />
            {t('engineering.productCreationGuide.readHandbook')}
          </Link>
        </Button>
      </div>
    </div>
  )
}
