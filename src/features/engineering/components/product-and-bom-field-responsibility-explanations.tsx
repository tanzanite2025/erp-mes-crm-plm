import { type ReactNode } from 'react'
import { type TranslationKey } from '@/locales'
import { Box, Info, Layers, Scale } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

/** Shared business explanation only; callers supply actions and retain their own save/navigation rules. */
export function ProductAndBOMFieldResponsibilityExplanation({
  productAction,
  bomAction,
}: {
  productAction?: ReactNode
  bomAction?: ReactNode
}) {
  const { t } = useLanguage()
  return (
    <section
      aria-label={t('engineering.productAndBOMResponsibilities.title')}
      className='min-w-0 space-y-3'
    >
      <div className='space-y-1'>
        <h3 className='text-base font-semibold'>
          {t('engineering.productAndBOMResponsibilities.title')}
        </h3>
        <p className='text-sm leading-6 text-muted-foreground'>
          {t('engineering.productAndBOMResponsibilities.description')}
        </p>
      </div>
      <div className='grid min-w-0 gap-3 @2xl:grid-cols-2'>
        {(['product', 'bom'] as const).map((domain) => {
          const Icon = domain === 'product' ? Box : Layers
          return (
            <article
              key={domain}
              aria-label={t(
                `engineering.productAndBOMResponsibilities.${domain}.title`
              )}
              className={
                domain === 'product'
                  ? 'flex min-w-0 flex-col gap-3 rounded-xl border border-sky-300 bg-sky-50 p-4 text-sky-950 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-50'
                  : 'flex min-w-0 flex-col gap-3 rounded-xl border border-violet-300 bg-violet-50 p-4 text-violet-950 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-50'
              }
            >
              <h4 className='flex items-start gap-2 text-sm leading-6 font-semibold'>
                <Icon aria-hidden='true' className='mt-1 size-4 shrink-0' />
                {t(`engineering.productAndBOMResponsibilities.${domain}.title`)}
              </h4>
              <p className='text-sm leading-7 font-semibold'>
                {t(
                  `engineering.productAndBOMResponsibilities.${domain}.summary`
                )}
              </p>
              <p className='text-sm leading-7'>
                {t(
                  `engineering.productAndBOMResponsibilities.${domain}.description`
                )}
              </p>
              <p className='text-xs leading-6'>
                {t(
                  `engineering.productAndBOMResponsibilities.${domain}.example`
                )}
              </p>
              <div className='mt-auto pt-1'>
                {domain === 'product' ? productAction : bomAction}
              </div>
            </article>
          )
        })}
      </div>
      <div className='flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50'>
        <Scale aria-hidden='true' className='mt-1 size-4 shrink-0' />
        <div className='space-y-1 text-sm leading-7'>
          <p className='font-semibold'>
            {t('engineering.productAndBOMResponsibilities.weightRule')}
          </p>
          <p>
            {t('engineering.productAndBOMResponsibilities.saveProductFirst')}
          </p>
        </div>
      </div>
    </section>
  )
}

export function ProductAndBOMFieldResponsibilityNotice({
  context,
  t,
}: {
  context: 'product' | 'bom' | 'template'
  t: (key: TranslationKey) => string
}) {
  return (
    <div
      role='note'
      className='flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-xs leading-6 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50'
    >
      <Info aria-hidden='true' className='mt-1 size-3.5 shrink-0' />
      <p>
        {t(
          context === 'template'
            ? 'engineering.productAndBOMResponsibilities.templateNotice'
            : `engineering.productAndBOMResponsibilities.${context}.notice`
        )}
      </p>
    </div>
  )
}
