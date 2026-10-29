import { Link } from '@tanstack/react-router'
import { ArrowRight, Info } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import {
  type ProductionMaterialHandoversOperationGuideChapter,
  productionMaterialHandoversOperationGuideReferencePages,
} from '../data/production-material-handovers-operation-guide-chapter-definitions'
import { ProductionMaterialHandoversOperationGuideStepActions } from './production-material-handovers-operation-guide-step-action-provider'

/** Business workflows are mounted only when the reader explicitly opens a step action. */
export function ProductionMaterialHandoversOperationGuideChapterExplanations({
  chapter,
}: {
  chapter: ProductionMaterialHandoversOperationGuideChapter
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const permittedReferences = chapter.referenceKeys.filter((key) =>
    matchesPathPermissionProjection(
      user,
      productionMaterialHandoversOperationGuideReferencePages[key]
    )
  )

  return (
    <div className='grid min-w-0 items-start gap-5 @5xl:grid-cols-[minmax(0,1fr)_17rem]'>
      <article className='min-w-0 space-y-4'>
        <div className='space-y-2'>
          <h2 className='text-base leading-7 font-semibold'>
            {t(
              `warehouse.productionMaterialHandoversGuide.chapters.${chapter.key}.title`
            )}
          </h2>
          <p className='text-sm leading-7 text-muted-foreground'>
            {t(
              `warehouse.productionMaterialHandoversGuide.chapters.${chapter.key}.description`
            )}
          </p>
        </div>
        <section className='space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/35'>
          <h3 className='flex items-start gap-2 text-sm leading-6 font-semibold text-amber-950 dark:text-amber-100'>
            <Info aria-hidden='true' className='mt-1 size-4 shrink-0' />
            {t(
              `warehouse.productionMaterialHandoversGuide.chapters.${chapter.key}.noticeTitle`
            )}
          </h3>
          <p className='text-sm leading-7 text-amber-900 dark:text-amber-200'>
            {t(
              `warehouse.productionMaterialHandoversGuide.chapters.${chapter.key}.noticeDescription`
            )}
          </p>
        </section>
        <ol className='divide-y rounded-xl border bg-card px-4 sm:px-5'>
          {chapter.steps.map((step, index) => (
            <li key={step} className='flex gap-3 py-4'>
              <span
                aria-hidden='true'
                className='mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-900 dark:bg-sky-950 dark:text-sky-100'
              >
                {index + 1}
              </span>
              <div className='min-w-0 space-y-2'>
                <h3 className='text-sm leading-6 font-semibold'>
                  {t(
                    `warehouse.productionMaterialHandoversGuide.steps.${step}.title`
                  )}
                </h3>
                <p className='text-sm leading-7 text-muted-foreground'>
                  {t(
                    `warehouse.productionMaterialHandoversGuide.steps.${step}.description`
                  )}
                </p>
                <ProductionMaterialHandoversOperationGuideStepActions
                  step={step}
                />
              </div>
            </li>
          ))}
        </ol>
        {chapter.key === 'reconciliation' && (
          <section className='space-y-3 rounded-xl border border-sky-200 bg-sky-50/45 p-4 dark:border-sky-900 dark:bg-sky-950/20'>
            <h3 className='text-sm font-semibold'>
              {t('warehouse.productionMaterialHandoversGuide.example.title')}
            </h3>
            <p className='text-sm leading-7'>
              {t(
                'warehouse.productionMaterialHandoversGuide.example.assumption'
              )}
            </p>
            <ol className='space-y-2 text-sm leading-7'>
              {(
                ['firstIssue', 'nextIssue', 'supplement', 'return'] as const
              ).map((step) => (
                <li
                  key={step}
                  className='rounded-lg bg-background/80 px-3 py-2'
                >
                  {t(
                    `warehouse.productionMaterialHandoversGuide.example.${step}`
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
      </article>
      {permittedReferences.length > 0 && (
        <aside className='min-w-0 space-y-3 rounded-xl border bg-card p-4'>
          <h2 className='text-sm font-semibold'>
            {t('warehouse.productionMaterialHandoversGuide.referenceTitle')}
          </h2>
          <p className='text-xs leading-6 text-muted-foreground'>
            {t(
              'warehouse.productionMaterialHandoversGuide.referenceDescription'
            )}
          </p>
          <ul className='space-y-2'>
            {permittedReferences.map((key) => (
              <li key={key}>
                <Link
                  to={
                    productionMaterialHandoversOperationGuideReferencePages[key]
                  }
                  className='flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm leading-6 text-sky-700 transition-colors hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-sky-300 dark:hover:bg-sky-950/40'
                >
                  {t(
                    `warehouse.productionMaterialHandoversGuide.references.${key}`
                  )}
                  <ArrowRight aria-hidden='true' className='size-4 shrink-0' />
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  )
}
