import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { ProductAndBOMFieldResponsibilityExplanation } from '@/features/engineering/components/product-and-bom-field-responsibility-explanations'
import { BOMCreationGuideDraftEntry } from './bom-creation-guide-draft-entry'

/** Composes existing business entries; explanations and guide pages never construct save payloads. */
export function ProductAndBOMResponsibilityGuideWithBusinessEntryActions() {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const canAccessProducts = matchesPathPermissionProjection(
    user,
    '/engineering/products'
  )
  return (
    <ProductAndBOMFieldResponsibilityExplanation
      productAction={
        canAccessProducts ? (
          <Button
            asChild
            className='h-auto min-h-9 w-full justify-between bg-sky-700 py-2 text-start text-xs whitespace-normal text-white hover:bg-sky-800 dark:bg-sky-500 dark:text-sky-950 dark:hover:bg-sky-400'
          >
            <Link to='/engineering/products'>
              {t('engineering.productAndBOMResponsibilities.product.entry')}
              <ArrowRight aria-hidden='true' className='size-4 shrink-0' />
            </Link>
          </Button>
        ) : (
          <p className='text-xs leading-6'>
            {t(
              'engineering.productAndBOMResponsibilities.productAccessRequired'
            )}
          </p>
        )
      }
      bomAction={<BOMCreationGuideDraftEntry presentation='inline' />}
    />
  )
}
