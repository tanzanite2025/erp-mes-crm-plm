import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'

const productCodeOperationGuideBusinessEntries = [
  {
    path: '/code-center/linear-barcode/protocol',
    labelKey:
      'productCodeLinearBarcodeAndQrCodeOperationGuide.entries.protocol',
  },
  {
    path: '/code-center/shared-code-source/hole-codes',
    labelKey:
      'productCodeLinearBarcodeAndQrCodeOperationGuide.entries.holeCodes',
  },
  {
    path: '/code-center/shared-code-source/numbering-engine',
    labelKey:
      'productCodeLinearBarcodeAndQrCodeOperationGuide.entries.numberingEngine',
  },
  {
    path: '/code-center/linear-barcode/print',
    labelKey: 'productCodeLinearBarcodeAndQrCodeOperationGuide.entries.print',
  },
  {
    path: '/cutting-operations/product-binding',
    labelKey:
      'productCodeLinearBarcodeAndQrCodeOperationGuide.entries.productBinding',
  },
  {
    path: '/production-execution',
    labelKey:
      'productCodeLinearBarcodeAndQrCodeOperationGuide.entries.productionExecution',
  },
] as const

/** Links to existing code and on-site business pages without duplicating their forms or write logic. */
export function ProductCodeLinearBarcodeAndQrCodeOperationGuideBusinessEntryActions() {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const accessibleEntries = productCodeOperationGuideBusinessEntries.filter(
    (entry) => matchesPathPermissionProjection(user, entry.path)
  )

  if (accessibleEntries.length === 0) return null

  return (
    <section className='mx-2 shrink-0 rounded-2xl border border-sky-200/70 bg-sky-50/45 px-4 py-3 md:mx-4 dark:border-sky-900/60 dark:bg-sky-950/20'>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
        <p className='flex items-center gap-2 text-xs leading-5 font-semibold text-sky-800 dark:text-sky-200'>
          <BookOpen aria-hidden='true' className='size-4 shrink-0' />
          {t(
            'productCodeLinearBarcodeAndQrCodeOperationGuide.businessEntryHint'
          )}
        </p>
        <div className='flex flex-wrap gap-2'>
          {accessibleEntries.map((entry) => (
            <Button
              key={entry.path}
              asChild
              variant='outline'
              size='sm'
              className='rounded-full border-sky-600/20 bg-background px-3 text-sky-700 hover:bg-sky-50 dark:border-sky-400/30 dark:text-sky-300 dark:hover:bg-sky-950/40'
            >
              <Link to={entry.path}>
                {t(entry.labelKey)}
                <ArrowRight aria-hidden='true' className='size-3.5' />
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </section>
  )
}
